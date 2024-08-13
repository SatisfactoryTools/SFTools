import {Injectable} from '@angular/core';
import {map, Observable, of} from 'rxjs';
import {Data} from '@src/Model/Data/Data';
import {Recipe} from '@src/Model/Data/Entities/Recipe';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {EnabledRecipesResolver} from '@src/Model/Planner/EnabledRecipesResolver';
import {Formulas} from '@src/Model/Planner/Formulas';
import {GeneratorFuelOption} from '@src/Model/Planner/Solver/Request/GeneratorFuelOption';
import {OptimisationDefaults} from '@src/Model/Planner/OptimisationDefaults';
import {OptimisationTarget} from '@src/Model/Planner/Solver/Request/OptimisationTarget';
import {GeneratorNode} from '@src/Model/Planner/Solver/Response/GeneratorNode';
import {HighsSolution} from '@src/Model/Planner/Solver/HighsSolution';
import {MachineGroupNormalizer} from '@src/Model/Planner/MachineGroupNormalizer';
import {Plan} from '@src/Model/Planner/Plan';
import {ProductionResponse} from '@src/Model/Planner/ProductionResponse';
import {SloopAccuracy} from '@src/Model/Planner/SloopAccuracy';
import {SolverWorkerOptions} from '@src/Model/Planner/Solver/Worker/SolverWorkerOptions';
import {SolverWorkerResponseType} from '@src/Model/Planner/Solver/Worker/SolverWorkerResponseType';
import {SolverService} from '@src/Model/Planner/Solver/SolverService';
import {InputSource} from '@src/Model/Planner/Solver/Request/InputSource';
import {SolverRequest} from '@src/Model/Planner/Solver/Request/SolverRequest';
import {SpecialClasses} from '@src/Model/Planner/SpecialClasses';
import {Item} from '@src/Model/Data/Entities/Item';
import {SolverResponse} from '@src/Model/Planner/Solver/Response/SolverResponse';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {InputNode} from '@src/Model/Planner/Solver/Response/InputNode';
import {MineNode} from '@src/Model/Planner/Solver/Response/MineNode';
import {ByproductNode} from '@src/Model/Planner/Solver/Response/ByproductNode';
import {PlanBreakdownService} from '@src/Model/Planner/Breakdown/PlanBreakdownService';
import {SloopBudgetService} from '@src/Model/Planner/SloopBudgetService';
import {ProductNode} from '@src/Model/Planner/Solver/Response/ProductNode';
import {RecipeNode} from '@src/Model/Planner/Solver/Response/RecipeNode';
import {SinkNode} from '@src/Model/Planner/Solver/Response/SinkNode';
import {SubplanNode} from '@src/Model/Planner/Solver/Response/SubplanNode';

@Injectable({providedIn: 'root'})
export class ProductionSolverService
{

	public constructor(
		private readonly solver: SolverService,
		private readonly versionManager: VersionManager,
		private readonly normalizer: MachineGroupNormalizer,
		private readonly enabledRecipes: EnabledRecipesResolver,
		private readonly breakdown: PlanBreakdownService,
		private readonly sloopBudget: SloopBudgetService,
	)
	{
	}

	/**
	 * Locked nodes are user-owned constraints: each becomes a fixed column in
	 * the LP so the solver builds the rest of the plan around their exact
	 * production and consumption. They are never rebuilt from the solution -
	 * the caller keeps the original node instances. Covers locked recipe
	 * nodes and subplan nodes (which are always locked).
	 */
	public solve(plan: Plan, lockedNodes: Node[] = []): Observable<SolverResponse>
	{
		const data = this.versionManager.activeVersionData();
		if (data === null) {
			throw new Error('No active version data');
		}
		// Locked nodes make the solve meaningful on their own - the LP builds the
		// production their inputs demand. Only a plan with neither is truly empty.
		if (plan.requests.length === 0 && lockedNodes.length === 0) {
			return of({status: 'Empty' as SolverWorkerResponseType, nodes: []});
		}

		const optimisation = this.optimisationTarget(plan);
		if (Object.keys(optimisation.rawResources).length === 0 && optimisation.power <= 0 && optimisation.machines <= 0) {
			throw new Error('No optimisation goal is enabled - enable at least one in the Optimisation tab.');
		}

		const request: SolverRequest = {
			optimisation,
			recipes: this.allowedRecipes(plan, data),
			productions: plan.requests
				.filter(request => request.itemClassName !== SpecialClasses.PowerTarget
					&& request.itemClassName !== SpecialClasses.SinkPointsTarget)
				.map(request => {
					return {
						item: data.getItemByClassName(request.itemClassName) as Item,
						amount: request.ratePerMinute,
					};
				}),
			// Locked recipe nodes already commit somersloops; the solver only gets the rest to place.
			inputs: this.inputSources(plan, data),
			maxSloops: this.sloopBudget.remaining(Math.max(0, Math.round(plan.settings.maxSloops ?? 0)), plan.graph),
			defaultClockSpeed: Formulas.clampClock(plan.settings.defaultClockSpeed ?? 100),
			recipeClockSpeeds: this.recipeClockSpeeds(plan),
			resourceLimits: plan.settings.resourceLimits ?? {},
			generators: this.enabledGenerators(plan, data),
			powerDemand: this.powerDemand(plan),
			producePowerForFactory: plan.settings.producePowerForFactory ?? false,
			excessPowerFraction: (plan.settings.excessPowerPercent ?? 10) / 100,
			sinkableItems: this.sinkableItems(plan, data),
			sinkPointsDemand: this.sinkPointsDemand(plan),
		};

		const lp = this.buildLp(request, data, lockedNodes);
		//console.log(lp);
		return this.solver.solve(lp, this.solveOptions(request, plan)).pipe(
			map(solution => this.parseSolution(solution, data)),
		);
	}

	/**
	 * Somersloops turn the model into a MIP; the accuracy setting picks the
	 * allowed relative deviation from the optimal objective (and a matching
	 * timeout - high accuracy can genuinely take minutes).
	 */
	private solveOptions(request: SolverRequest, plan: Plan): {workerOptions?: SolverWorkerOptions; timeoutMs?: number}
	{
		if (request.maxSloops <= 0) {
			return {};
		}
		const accuracy = plan.settings.sloopAccuracy ?? 'low';
		const byAccuracy: Record<SloopAccuracy, {mipRelGap: number; timeoutMs: number}> = {
			low: {mipRelGap: 0.5, timeoutMs: 240_000},
			medium: {mipRelGap: 0.1, timeoutMs: 960_000},
			high: {mipRelGap: 0.05, timeoutMs: 4800_000},
		};
		const chosen = byAccuracy[accuracy];
		return {workerOptions: {mipRelGap: chosen.mipRelGap}, timeoutMs: chosen.timeoutMs};
	}

	/**
	 * Explains a failed solve as far as the LP allows: names requested items
	 * that no enabled recipe chain can produce at all, re-solves without the
	 * raw-resource limits to attribute the failure to them, and otherwise
	 * falls back to a generic message.
	 */
	public diagnoseFailure(plan: Plan, lockedNodes: Node[] = []): Observable<string>
	{
		const generic = 'No solution found - the request cannot be satisfied with the current recipes, resource limits and locked nodes.';
		const data = this.versionManager.activeVersionData();
		if (data === null) {
			return of(generic);
		}

		const unproducible = this.findUnproducibleRequests(plan, data, lockedNodes);
		if (unproducible.length > 0) {
			return of(`No solution: ${unproducible.join(', ')} cannot be produced with the currently enabled recipes and available raw resources - check the Recipes and Resources tabs.`);
		}

		if ((this.powerDemand(plan) > 0 || (plan.settings.producePowerForFactory ?? false))
			&& this.enabledGenerators(plan, data).length === 0) {
			return of('No solution: power is needed (requested or to run the factory) but no generator fuels are enabled - enable some in the Power tab.');
		}

		if (this.sinkPointsDemand(plan) > 0 && this.sinkableItems(plan, data).length === 0) {
			return of('No solution: sink points are requested but no sinkable items are enabled - enable some in the Sink tab.');
		}

		if (Object.keys(plan.settings.resourceLimits ?? {}).length > 0) {
			const unlimited: Plan = {...plan, settings: {...plan.settings, resourceLimits: undefined}};
			return this.solve(unlimited, lockedNodes).pipe(
				map(result => result.status === 'Optimal'
					? 'No solution: the raw resource limits are too low for this request - raise them in the Resources tab.'
					: generic),
			);
		}

		return of(generic);
	}

	/**
	 * Requested items outside the closure of what the enabled recipes can make
	 * from the available raw resources (and locked nodes' outputs) - those
	 * make the LP infeasible no matter the amounts.
	 */
	private findUnproducibleRequests(plan: Plan, data: Data, lockedNodes: Node[]): string[]
	{
		const recipes = this.allowedRecipes(plan, data);
		const limits = plan.settings.resourceLimits ?? {};

		const producible = new Set<string>();
		data.resources.forEach(className => {
			if ((limits[className] ?? Infinity) > 0) {
				producible.add(className);
			}
		});
		lockedNodes.forEach(node => node.outputs.forEach(io => producible.add(io.item.className)));
		// User inputs are direct sources of their item.
		this.inputSources(plan, data).forEach(input => producible.add(input.item.className));

		// Enabled generator fuels act like recipes for reachability: burning a
		// producible fuel (+ supplemental) yields the burn byproduct.
		const generatorPaths = this.enabledGenerators(plan, data)
			.filter(option => option.fuel.byproduct !== null)
			.map(option => ({
				ingredients: [option.fuel.item, ...(option.fuel.supplementalItem ? [option.fuel.supplementalItem] : [])],
				product: option.fuel.byproduct!,
			}));

		let changed = true;
		while (changed) {
			changed = false;
			for (const recipe of recipes) {
				if (!recipe.ingredients.every(ingredient => producible.has(ingredient.item.className))) {
					continue;
				}
				for (const product of recipe.products) {
					if (!producible.has(product.item.className)) {
						producible.add(product.item.className);
						changed = true;
					}
				}
			}
			for (const path of generatorPaths) {
				if (!producible.has(path.product.className)
					&& path.ingredients.every(ingredient => producible.has(ingredient.className))) {
					producible.add(path.product.className);
					changed = true;
				}
			}
		}

		return plan.requests
			.filter(request => request.itemClassName !== ''
				&& request.itemClassName !== SpecialClasses.PowerTarget
				&& request.itemClassName !== SpecialClasses.SinkPointsTarget)
			.filter(request => !producible.has(request.itemClassName))
			.map(request => data.searchItemByClassName(request.itemClassName)?.name ?? request.itemClassName);
	}

	/**
	 * Resolves the plan's optimisation settings into concrete solver weights:
	 * disabled goals become 0 / an empty map, absent values fall back to the
	 * defaults (resources + power on, machines off).
	 */
	private optimisationTarget(plan: Plan): OptimisationTarget
	{
		const settings = plan.settings.optimisation;
		const resourcesEnabled = settings?.rawResources ?? true;
		const powerEnabled = settings?.power ?? true;
		const machinesEnabled = settings?.machines ?? false;

		const rawResources: Record<string, number> = {};
		if (resourcesEnabled) {
			Object.keys(OptimisationDefaults.resourceWeights).forEach(className => {
				rawResources[className] = OptimisationDefaults.resourceWeight(className, settings?.resourceWeights);
			});
		}

		return {
			rawResources,
			power: powerEnabled ? settings?.powerWeight ?? OptimisationDefaults.powerWeight : 0,
			machines: machinesEnabled ? settings?.machinesWeight ?? OptimisationDefaults.machinesWeight : 0,
		};
	}

	/** Total requested power in MW across the plan's requests. */
	private powerDemand(plan: Plan): number
	{
		return plan.requests
			.filter(request => request.itemClassName === SpecialClasses.PowerTarget)
			.reduce((sum, request) => sum + request.ratePerMinute, 0);
	}

	/** Total requested sink points per minute across the plan's requests. */
	private sinkPointsDemand(plan: Plan): number
	{
		return plan.requests
			.filter(request => request.itemClassName === SpecialClasses.SinkPointsTarget)
			.reduce((sum, request) => sum + request.ratePerMinute, 0);
	}

	private sinkableItems(plan: Plan, data: Data): Item[]
	{
		return (plan.settings.sinkableItems ?? [])
			.map(className => data.searchItemByClassName(className))
			.filter((item): item is Item => item !== undefined && item.sinkPoints > 0);
	}

	private allowedRecipes(plan: Plan, data: Data): Recipe[]
	{
		const enabled = this.enabledRecipes.resolve(plan.settings, data);
		return data.getRecipesForMachines().filter(recipe => enabled.has(recipe.className));
	}

	/** Resolves the plan's user inputs, dropping unknown/empty items and merging duplicates (summed amount, cheapest weight). */
	private inputSources(plan: Plan, data: Data): InputSource[]
	{
		const byItem = new Map<string, InputSource>();
		for (const input of plan.inputs ?? []) {
			const item = data.searchItemByClassName(input.itemClassName);
			if (!item || !(input.amount > 0)) {
				continue;
			}
			const weight = Math.max(0, input.weight ?? 0);
			const existing = byItem.get(item.className);
			if (existing) {
				existing.amount += input.amount;
				existing.weight = Math.min(existing.weight, weight);
			} else {
				byItem.set(item.className, {item, amount: input.amount, weight});
			}
		}
		return [...byItem.values()];
	}

	/** Resolves the plan's per-recipe clock overrides, dropping blank rows and clamping to 1–250%. Duplicate recipes: last row wins. */
	private recipeClockSpeeds(plan: Plan): Record<string, number>
	{
		const clocks: Record<string, number> = {};
		for (const entry of plan.settings.recipeClockSpeeds ?? []) {
			if (entry.recipeClassName !== '' && isFinite(entry.clockSpeed)) {
				clocks[entry.recipeClassName] = Formulas.clampClock(entry.clockSpeed);
			}
		}
		return clocks;
	}

	/** The clock speed the solver runs this recipe's machines at. */
	private clockFor(request: SolverRequest, recipe: Recipe): number
	{
		return request.recipeClockSpeeds[recipe.className] ?? request.defaultClockSpeed;
	}

	private enabledGenerators(plan: Plan, data: Data): GeneratorFuelOption[]
	{
		const options: GeneratorFuelOption[] = [];
		Object.entries(plan.settings.enabledFuels ?? {}).forEach(([generatorClass, fuelClasses]) => {
			const generator = data.searchBuildingByClassName(generatorClass);
			if (!generator) return;
			fuelClasses.forEach(fuelClass => {
				const fuel = generator.fuel.find(f => f.item.className === fuelClass);
				if (fuel) {
					options.push({generator, fuel});
				}
			});
		});
		return options;
	}

	/** LP names cannot contain hyphens, so the node's UUID is compacted. */
	private lockedVariableName(node: Node): string
	{
		return 'locked_' + node.id.replace(/-/g, '');
	}

	private buildLp(request: SolverRequest, data: Data, lockedNodes: Node[] = []): string
	{
		const lines: string[] = ['\\\\ Production Plan', 'Minimize'];

		// optimisation goal - solve() guarantees at least one enabled goal
		const optimisation: string[] = [];

		Object.keys(request.optimisation.rawResources).forEach(className => {
			if (request.optimisation.rawResources[className] > 0) {
				optimisation.push(request.optimisation.rawResources[className] + ' ' + className + '@Mine');
			}
		})

		// User inputs are priced by their weight, so the solver prefers cheaper
		// sources (a low weight makes an input attractive over mining/crafting).
		request.inputs.forEach(input => {
			if (input.weight > 0) {
				optimisation.push(input.weight + ' ' + input.item.className + '@Input');
			}
		});

		// Power and machine goals price every column by its machines and their
		// average draw (a recipe column is valued in machine counts).
		if (request.optimisation.power > 0 || request.optimisation.machines > 0) {
			request.recipes.forEach(recipe => {
				const clockSpeed = this.clockFor(request, recipe);
				recipe.producedIn.forEach(machine => {
					for (let sloops = 0; sloops <= Math.min(request.maxSloops, machine.sloopSlots); sloops++) {
						const cost = request.optimisation.power * Formulas.machinePowerUsage(recipe, machine, clockSpeed, sloops)
							+ request.optimisation.machines;
						if (cost > 0) {
							optimisation.push(cost + ' ' + recipe.className + '@' + machine.className + '%' + clockSpeed + '#' + sloops);
						}
					}
				});
			});
			if (request.optimisation.machines > 0) {
				request.generators.forEach(({generator, fuel}) =>
					optimisation.push(request.optimisation.machines + ' ' + fuel.item.className + '@Gen%' + generator.className));
			}
		}

		lines.push(optimisation.join('\n+ '));

		// recipes
		lines.push('\nSubject To');

		const items: Map<string, string[]> = new Map();
		const add = (className: string, str: string) => {
			const arr = items.get(className) ?? [];
			arr.push(str);
			items.set(className, arr);
		};

		const sloopedRecipes: Map<string, number> = new Map();
		const powerTerms: string[] = [];
		// Factory power: every machine's draw (variable-draw recipes at their
		// oscillation average) joins the power balance, scaled by the excess
		// margin. The generators' own fuel chain consumes power too, so more
		// generation means more consumption - the LP settles the loop.
		const factoryDrawFactor = request.producePowerForFactory ? 1 + request.excessPowerFraction : 0;

		request.recipes.forEach(recipe => {
			const clockSpeed = this.clockFor(request, recipe);
			recipe.producedIn.forEach(machine => {
				const speed = Formulas.referenceCycles(recipe, machine) * clockSpeed / 100;

				for (let sloops = 0; sloops <= Math.min(request.maxSloops, machine.sloopSlots); sloops++) {
					const boost = Formulas.sloopOutputMultiplier(machine, sloops);
					const recipeClass = recipe.className + '@' + machine.className + '%' + clockSpeed + '#' + sloops;

					recipe.ingredients.forEach(ingredient => {
						const amount = ingredient.amount * speed;
						add(ingredient.item.className, '- ' + amount + ' ' + recipeClass);
					});

					recipe.products.forEach(product => {
						const amount = product.amount * speed * boost;
						add(product.item.className, '+ ' + amount + ' ' + recipeClass);
					});

					if (factoryDrawFactor > 0) {
						const power = Formulas.machinePowerUsage(recipe, machine, clockSpeed, sloops);
						if (power > 0) {
							powerTerms.push('- ' + (power * factoryDrawFactor) + ' ' + recipeClass);
						}
					}

					// TODO add machine count

					if (sloops > 0) {
						sloopedRecipes.set(recipeClass, sloops);
					}
				}
			});
		});

		// Generators: one column per enabled generator+fuel pair, valued in
		// generator counts. Burning consumes the fuel (and supplemental
		// fluid), yields the burn byproduct, and feeds the power balance.
		// Surplus power is free to discard, so generators only run when their
		// byproduct is needed (or, later, when power itself is demanded).
		request.generators.forEach(({generator, fuel}) => {
			const varName = fuel.item.className + '@Gen%' + generator.className;
			const burnRate = Formulas.generatorBurnRate(generator, fuel);
			add(fuel.item.className, '- ' + burnRate + ' ' + varName);
			if (fuel.supplementalItem !== null) {
				add(fuel.supplementalItem.className, '- ' + Formulas.generatorSupplementalRate(generator) + ' ' + varName);
			}
			if (fuel.byproduct !== null) {
				add(fuel.byproduct.className, '+ ' + (burnRate * fuel.byproductAmount) + ' ' + varName);
			}
			powerTerms.push('+ ' + generator.powerProduction + ' ' + varName);
		});

		// Mines exist for every raw resource regardless of the optimisation
		// goals - the weight map above only prices them.
		data.resources.forEach(resourceClass => {
			add(resourceClass, '1 ' + resourceClass + '@Mine');
		})

		// User inputs are extra item sources, capped in Bounds below.
		request.inputs.forEach(input => {
			add(input.item.className, '+ 1 ' + input.item.className + '@Input');
		});

		// AWESOME Sink: one column per sinkable item, valued in items/min
		// sinked. Sinking consumes the item and feeds the sink-point balance.
		const sinkTerms: string[] = [];
		request.sinkableItems.forEach(item => {
			const varName = item.className + '@Sink';
			add(item.className, '- 1 ' + varName);
			sinkTerms.push('+ ' + Formulas.sinkPoints(item, 1) + ' ' + varName);
		});

		// A requested item nothing can produce still needs a constraint row -
		// without one its @Product variable floats free of any balance and
		// the LP happily "produces" it out of nothing.
		request.productions.forEach(production => {
			if (!items.has(production.item.className)) {
				items.set(production.item.className, []);
			}
		});

		// Locked nodes: one fixed column each (= 1 in Bounds) carrying the
		// node's exact aggregate IO. The per-item byproduct slack absorbs any
		// overproduction they cause, and the free recipe variables let the
		// solver top up beyond a lock as separate solver-owned nodes.
		lockedNodes.forEach(node => {
			const varName = this.lockedVariableName(node);
			node.inputs.forEach(io => add(io.item.className, '- ' + io.maxAmount + ' ' + varName));
			node.outputs.forEach(io => add(io.item.className, '+ ' + io.maxAmount + ' ' + varName));

			// A locked generator feeds the power balance like an enabled one; its
			// fuel and byproduct already flow through the inputs/outputs above.
			if (node instanceof GeneratorNode) {
				powerTerms.push('+ ' + node.powerProduction() + ' ' + varName);
			}

			if (factoryDrawFactor > 0) {
				if (node instanceof RecipeNode && node.averagePowerUsage() > 0) {
					powerTerms.push('- ' + (node.averagePowerUsage() * factoryDrawFactor) + ' ' + varName);
				} else if (node instanceof SubplanNode) {
					// A subplan brings its own (recursive) power balance; net
					// draw needs covering, a net surplus feeds the grid as is.
					const power = this.breakdown.subplanPower(node.subplanId);
					const net = power.consumption - power.production;
					if (net > 0) {
						powerTerms.push('- ' + (net * factoryDrawFactor) + ' ' + varName);
					} else if (net < 0) {
						powerTerms.push('+ ' + (-net) + ' ' + varName);
					}
				}
			}
		});

		const byproducts: string[] = [];

		items.forEach((usage, itemClass) => {
			lines.push('\\\\ ' + itemClass);
			lines.push(...usage)
			lines.push('- 1 ' + itemClass + '@Byproduct');
			byproducts.push(itemClass);

			const item = data.getItemByClassName(itemClass);
			if (item && request.productions.some(production => production.item === item)) {
				lines.push('- 1 ' + itemClass + '@Product');
			}

			lines.push(' = 0');
		});

		// Power balance in MW: generation minus discarded surplus must equal
		// the requested power. Emitted whenever there is demand, so an
		// uncoverable request (no generators) is correctly infeasible.
		if (powerTerms.length > 0 || request.powerDemand > 0) {
			lines.push('\\\\ Power');
			lines.push(...powerTerms);
			lines.push('- 1 PowerSurplus');
			lines.push(' = ' + request.powerDemand);
		}

		// Sink-point balance: points earned minus discarded surplus must equal
		// the requested points. Emitted whenever there is demand, so an
		// uncoverable request (nothing sinkable) is correctly infeasible.
		if (sinkTerms.length > 0 || request.sinkPointsDemand > 0) {
			lines.push('\\\\ SinkPoints');
			lines.push(...sinkTerms);
			lines.push('- 1 SinkPointsSurplus');
			lines.push(' = ' + request.sinkPointsDemand);
		}

		if (request.maxSloops > 0) {
			const sloopLines: string[] = [];

			sloopedRecipes.forEach((sloops, recipe) => {
				lines.push(recipe + '_count - ' + recipe + ' >= 0');
				sloopLines.push(sloops + ' ' + recipe + '_count');
			});

			if (sloopLines.length) {
				lines.push(...sloopLines);
				lines.push(' <= ' + request.maxSloops);
			}
		}

		// bounds

		lines.push('\nBounds');
		byproducts.forEach(byproduct => {
			lines.push(byproduct + '@Byproduct >= 0');
		});
		if (powerTerms.length > 0 || request.powerDemand > 0) {
			lines.push('PowerSurplus >= 0');
		}
		if (sinkTerms.length > 0 || request.sinkPointsDemand > 0) {
			lines.push('SinkPointsSurplus >= 0');
		}

		request.productions.forEach(production => {
			lines.push(production.item.className + '@Product = ' + production.amount);
		});

		// Raw-resource caps: the solver may not mine beyond the plan's limits.
		Object.entries(request.resourceLimits).forEach(([className, limit]) => {
			if (data.resources.includes(className)) {
				lines.push(className + '@Mine <= ' + limit);
			}
		});

		// User-input caps: available only up to the specified amount per minute.
		request.inputs.forEach(input => {
			lines.push(input.item.className + '@Input <= ' + input.amount);
		});

		lockedNodes.forEach(node => {
			lines.push(this.lockedVariableName(node) + ' = 1');
		});

		// integer limitations

		if (sloopedRecipes.size) {
			lines.push('\nGeneral');
			sloopedRecipes.forEach((value, key) => {
				lines.push(key + '_count');
			});
		}


		lines.push('End');

		return lines.join('\n');
	}

	private parseSolution(solution: HighsSolution, data: Data): SolverResponse
	{
		const columns: {Primal: number, Name: string}[] = Object.values(solution.Columns) as unknown as {Primal: number, Name: string}[];

		const kept = columns
			// Snap away float dust below the LP's meaningful precision, so node
			// targets (and everything serialized from them) stay clean. The grid
			// must stay much finer than the warning tolerances: rounding every
			// column independently unbalances items by rate × grid/2 per column.
			.map(column => ({...column, Primal: Math.round(column.Primal * 1e9) / 1e9}))
			.filter(column => Math.abs(column.Primal) > 1e-6)
			.filter(column => !column.Name.endsWith('_count'))
			// Locked nodes pass through from the existing graph, never rebuilt.
			.filter(column => !column.Name.startsWith('locked_'))
			// Discarded excess power and sink points are not graph nodes.
			.filter(column => column.Name !== 'PowerSurplus' && column.Name !== 'SinkPointsSurplus')
			// Byproduct slack picks up the solver's feasibility-tolerance
			// noise; slivers below a thousandth per minute are not real
			// byproducts and would render as pointless "0.00/min" nodes.
			.filter(column => !(column.Name.endsWith('@Byproduct') && Math.abs(column.Primal) < 0.0005));

		const result: Node[] = kept
			.map(column => {
				// Globally unique so nodes can be appended/merged into an
				// existing graph without id collisions.
				const id = crypto.randomUUID();
				const [recipeClass, type] = column.Name.split('@');
				if (type?.startsWith('Gen%')) {
					const generator = data.getBuildingByClassName(type.slice(4));
					const fuel = generator.fuel.find(f => f.item.className === recipeClass)!;
					return new GeneratorNode(id, column.Primal, generator, fuel);
				}
				switch (type) {
					case 'Mine':
						return new MineNode(id, column.Primal, data.getItemByClassName(recipeClass));
					case 'Input':
						return new InputNode(id, column.Primal, data.getItemByClassName(recipeClass));
					case 'Byproduct':
						return new ByproductNode(id, column.Primal, data.getItemByClassName(recipeClass));
					case 'Product':
						return new ProductNode(id, column.Primal, data.getItemByClassName(recipeClass));
					// One AWESOME Sink node per sinked item, not one aggregate.
					case 'Sink':
						return new SinkNode(id, column.Primal, data.getItemByClassName(recipeClass));
					default:
						const [machine, meta] = type.split('%');
						const [clockSpeed, sloops] = meta.split('#');
						const clock = parseFloat(clockSpeed);

						// The LP variable counts machines AT the column's clock;
						// the node's target is machine-equivalents at 100%.
						return new RecipeNode(
							id,
							column.Primal * clock / 100,
							this.normalizer.fromFractionalAmount(column.Primal, clock, parseInt(sloops)),
							data.getBuildingByClassName(machine),
							data.getRecipeByClassName(recipeClass),
						);
				}
			});

		console.log('Objective: ', solution.ObjectiveValue);

		return {
			status: this.mapStatus(solution.Status),
			nodes: result,
		};
	}

	private mapStatus(highsStatus: string): SolverWorkerResponseType
	{
		switch (highsStatus) {
			case 'Optimal': return 'Optimal';
			case 'Infeasible':
			case 'Primal infeasible or unbounded': return 'Infeasible';
			case 'Unbounded': return 'Unbounded';
			default: return 'Error';
		}
	}

}
