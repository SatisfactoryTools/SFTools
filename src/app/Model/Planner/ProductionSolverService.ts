import {Injectable} from '@angular/core';
import {map, Observable, of} from 'rxjs';
import {Data} from '@src/Model/Data/Data';
import {Recipe} from '@src/Model/Data/Entities/Recipe';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {EnabledRecipesResolver} from '@src/Model/Planner/EnabledRecipesResolver';
import {ExtraPowerResolver} from '@src/Model/Planner/ExtraPowerResolver';
import {GroupingModeResolver} from '@src/Model/Planner/GroupingModeResolver';
import {Formulas} from '@src/Model/Planner/Formulas';
import {GeneratorFuelOption} from '@src/Model/Planner/Solver/Request/GeneratorFuelOption';
import {OptimisationDefaults} from '@src/Model/Planner/OptimisationDefaults';
import {ResourceWeightResolver} from '@src/Model/Planner/ResourceWeightResolver';
import {OptimisationTarget} from '@src/Model/Planner/Solver/Request/OptimisationTarget';
import {GeneratorNode} from '@src/Model/Planner/Solver/Response/GeneratorNode';
import {GroupingMode} from '@src/Model/Planner/GroupingMode';
import {HighsSolution} from '@src/Model/Planner/Solver/HighsSolution';
import {MachineGroupNormalizer} from '@src/Model/Planner/MachineGroupNormalizer';
import {Plan} from '@src/Model/Planner/Plan';
import {ProductionResponse} from '@src/Model/Planner/ProductionResponse';
import {SloopAccuracy} from '@src/Model/Planner/SloopAccuracy';
import {SolverWorkerOptions} from '@src/Model/Planner/Solver/Worker/SolverWorkerOptions';
import {SolverWorkerResponseType} from '@src/Model/Planner/Solver/Worker/SolverWorkerResponseType';
import {SolverService} from '@src/Model/Planner/Solver/SolverService';
import {InputSource} from '@src/Model/Planner/Solver/Request/InputSource';
import {MaximiseCategory} from '@src/Model/Planner/Solver/Request/MaximiseCategory';
import {MaximiseTarget} from '@src/Model/Planner/Solver/Request/MaximiseTarget';
import {SolveRunHandle} from '@src/Model/Planner/Solver/SolveRunHandle';
import {SolverRequest} from '@src/Model/Planner/Solver/Request/SolverRequest';
import {SpecialClasses} from '@src/Model/Planner/SpecialClasses';
import {Building} from '@src/Model/Data/Entities/Building';
import {Item} from '@src/Model/Data/Entities/Item';
import {SolverResponse} from '@src/Model/Planner/Solver/Response/SolverResponse';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {InputNode} from '@src/Model/Planner/Solver/Response/InputNode';
import {MineNode} from '@src/Model/Planner/Solver/Response/MineNode';
import {AugmenterNode} from '@src/Model/Planner/Solver/Response/AugmenterNode';
import {ByproductNode} from '@src/Model/Planner/Solver/Response/ByproductNode';
import {PlanBreakdownService} from '@src/Model/Planner/Breakdown/PlanBreakdownService';
import {ResourcePoolService} from '@src/Model/Planner/Pool/ResourcePoolService';
import {SloopBudgetService} from '@src/Model/Planner/SloopBudgetService';
import {ProductNode} from '@src/Model/Planner/Solver/Response/ProductNode';
import {RecipeNode} from '@src/Model/Planner/Solver/Response/RecipeNode';
import {SinkNode} from '@src/Model/Planner/Solver/Response/SinkNode';
import {SubplanNode} from '@src/Model/Planner/Solver/Response/SubplanNode';

@Injectable({providedIn: 'root'})
export class ProductionSolverService
{

	private static readonly MAXIMISE_EPSILON = 0.001;

	public constructor(
		private readonly solver: SolverService,
		private readonly versionManager: VersionManager,
		private readonly normalizer: MachineGroupNormalizer,
		private readonly enabledRecipes: EnabledRecipesResolver,
		private readonly groupingModes: GroupingModeResolver,
		private readonly breakdown: PlanBreakdownService,
		private readonly sloopBudget: SloopBudgetService,
		private readonly pool: ResourcePoolService,
		private readonly resourceWeights: ResourceWeightResolver,
		private readonly extraPower: ExtraPowerResolver,
	)
	{
	}

	public solve(plan: Plan, lockedNodes: Node[] = []): Observable<SolverResponse>
	{
		const data = this.versionManager.activeVersionData();
		if (data === null) {
			throw new Error('No active version data');
		}
		// Locked nodes alone make a solve meaningful: the LP builds what their inputs demand.
		if (plan.requests.length === 0 && lockedNodes.length === 0) {
			return of({status: 'Empty' as SolverWorkerResponseType, nodes: []});
		}

		// The augmenters are built before any machine gets a somersloop, so an
		// over-spent budget is a settings mistake rather than a hard solve.
		const extra = this.extraPower.resolve(plan.settings);
		const sloopBudget = this.sloopBudgetOf(plan);
		if (extra.sloopCost > sloopBudget) {
			throw new Error(`The ${extra.augmenters.count} alien power augmenters cost ${extra.sloopCost} somersloops, `
				+ `but the plan only has ${sloopBudget}. `
				+ 'Raise the budget in the Sloops tab or build fewer augmenters in the Power tab.');
		}

		const optimisation = this.optimisationTarget(plan, data);
		const request = this.buildRequest(plan, data, optimisation);
		// Weighted inputs count as a goal of their own, as long as at least one is priced.
		const weightedInputs = optimisation.inputs && request.inputs.some(input => input.weight > 0);
		if (Object.keys(optimisation.rawResources).length === 0 && optimisation.power <= 0 && optimisation.machines <= 0 && !weightedInputs) {
			throw new Error('No goal is enabled. Enable at least one in the Optimisation tab.');
		}
		const maximise = this.maximiseTarget(plan, data);
		if (maximise !== null) {
			return this.solveMaximise(plan, data, request, maximise, lockedNodes);
		}

		const lp = this.buildLp(request, data, lockedNodes);
		return this.solver.solve(lp, this.solveOptions(request, plan)).pipe(
			map(solution => {
				const response = this.parseSolution(solution, data, this.groupingModes.resolve(plan.settings));
				return {...response, nodes: [...response.nodes, ...this.augmenterNodes(plan, data)]};
			}),
		);
	}

	private buildRequest(plan: Plan, data: Data, optimisation: OptimisationTarget): SolverRequest
	{
		return {
			optimisation,
			maximise: null,
			carryInputs: [],
			recipes: this.allowedRecipes(plan, data),
			// Maximised rows never become hard targets here; the maximise loop handles them itself.
			productions: plan.requests
				.filter(request => (request.mode ?? 'rate') === 'rate')
				.filter(request => request.itemClassName !== SpecialClasses.PowerTarget
					&& request.itemClassName !== SpecialClasses.SinkPointsTarget)
				.map(request => {
					return {
						item: data.getItemByClassName(request.itemClassName) as Item,
						amount: request.ratePerMinute,
					};
				}),
			inputs: this.inputSources(plan, data),
			maxSloops: this.machineSloops(plan),
			defaultClockSpeed: Formulas.clampClock(plan.settings.defaultClockSpeed ?? 100),
			recipeClockSpeeds: this.recipeClockSpeeds(plan),
			machineClockSpeeds: this.machineClockSpeeds(plan),
			generatorClockSpeeds: this.generatorClockSpeeds(plan),
			resourceLimits: this.pool.effectiveLimits(plan),
			generators: this.enabledGenerators(plan, data),
			extraPower: this.extraPower.resolve(plan.settings),
			powerDemand: this.powerDemand(plan),
			producePowerForFactory: plan.settings.producePowerForFactory ?? false,
			excessPowerFraction: (plan.settings.excessPowerPercent ?? 10) / 100,
			disabledByproducts: plan.settings.disabledByproducts ?? [],
			sinkableItems: this.sinkableItems(plan, data),
			sinkPointsDemand: this.sinkPointsDemand(plan),
		};
	}

	/** The UI enforces a single maximised category, but synced data may not. */
	private maximiseTarget(plan: Plan, data: Data): MaximiseTarget | null
	{
		const rows = plan.requests.filter(request => request.mode === 'maximise' && request.itemClassName !== '');
		if (rows.length === 0) {
			return null;
		}
		const categories = new Set<MaximiseCategory>(rows.map(row => this.categoryOf(row.itemClassName)));
		if (categories.size > 1) {
			throw new Error('Only one kind of target (items, power or sink points) can be maximised at a time.');
		}
		const category = [...categories][0];
		const items = category !== 'items' ? [] : [...new Set(rows.map(row => row.itemClassName))]
			.map(className => data.searchItemByClassName(className))
			.filter((item): item is Item => item !== undefined);
		return {category, items};
	}

	private categoryOf(itemClassName: string): MaximiseCategory
	{
		if (itemClassName === SpecialClasses.PowerTarget) {
			return 'power';
		}
		if (itemClassName === SpecialClasses.SinkPointsTarget) {
			return 'sinkPoints';
		}
		return 'items';
	}

	/** Somersloops turn the model into a MIP; high accuracy can genuinely take minutes. */
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

	public diagnoseFailure(plan: Plan, lockedNodes: Node[] = []): Observable<string>
	{
		const generic = 'No solution found. What you asked for cannot be made with the current recipes, resource limits and locked nodes.';
		const data = this.versionManager.activeVersionData();
		if (data === null) {
			return of(generic);
		}

		const unproducible = this.findUnproducibleRequests(plan, data, lockedNodes);
		if (unproducible.length > 0) {
			return of(`No solution: ${unproducible.join(', ')} cannot be made with the enabled recipes and the available raw resources. Check the Recipes, Machines and Resources tabs.`);
		}

		const extra = this.extraPower.resolve(plan.settings);
		if ((this.powerDemand(plan) > 0 || (plan.settings.producePowerForFactory ?? false))
			&& this.enabledGenerators(plan, data).length === 0) {
			return of('No solution: power is needed (as a target or to run the factory) but no generator fuel is enabled'
				+ (extra.isActive ? ', and the geothermal generators and augmenters do not make enough' : '')
				+ '. Enable some fuels in the Power tab.');
		}

		if (extra.matrixDemand > 0
			&& !this.producibleItems(plan, data, lockedNodes).has(SpecialClasses.AlienPowerMatrixItem)) {
			const matrix = data.searchItemByClassName(SpecialClasses.AlienPowerMatrixItem)?.name ?? 'Alien Power Matrix';
			return of(`No solution: the boosted alien power augmenters need ${extra.matrixDemand}/min of ${matrix}, `
				+ 'which cannot be made with the enabled recipes and the available raw resources. '
				+ 'Check the Recipes, Machines and Resources tabs, or switch the augmenters back to the normal mode in the Power tab.');
		}

		if (this.sinkPointsDemand(plan) > 0 && this.sinkableItems(plan, data).length === 0) {
			return of('No solution: sink points are a target but no item may go into the sink. Enable some in the Sink tab.');
		}

		// Dropping the limits from a maximise plan makes it unbounded rather
		// than solvable, so the attribution re-solve only applies to fixed rates.
		const constrained = Object.keys(plan.settings.resourceLimits ?? {}).length > 0 || (plan.settings.disabledResources?.length ?? 0) > 0;
		if (constrained && this.maximiseTarget(plan, data) === null) {
			const unlimited: Plan = {...plan, settings: {...plan.settings, resourceLimits: undefined, disabledResources: undefined}};
			const poolFolder = this.pool.status(plan) === null ? null : this.planFolderName(plan);
			return this.solve(unlimited, lockedNodes).pipe(
				map(result => {
					if (result.status !== 'Optimal') {
						return generic;
					}
					return poolFolder === null
						? 'No solution: the raw resource limits are too low, or a needed resource is switched off. Raise the limits or enable the resource in the Resources tab.'
						: `No solution: the shared raw resources of folder ${poolFolder} are not enough for this plan. `
							+ 'Other plans in the folder already use a part of them. Raise the folder limits or make the other plans smaller.';
				}),
			);
		}

		return of(generic);
	}

	private planFolderName(plan: Plan): string
	{
		const folder = this.pool.poolFolderName(plan);
		return folder === null ? 'the folder' : `"${folder}"`;
	}

	private findUnproducibleRequests(plan: Plan, data: Data, lockedNodes: Node[]): string[]
	{
		const producible = this.producibleItems(plan, data, lockedNodes);

		return plan.requests
			.filter(request => request.itemClassName !== ''
				&& request.itemClassName !== SpecialClasses.PowerTarget
				&& request.itemClassName !== SpecialClasses.SinkPointsTarget)
			.filter(request => !producible.has(request.itemClassName))
			.map(request => data.searchItemByClassName(request.itemClassName)?.name ?? request.itemClassName);
	}

	private producibleItems(plan: Plan, data: Data, lockedNodes: Node[]): Set<string>
	{
		const recipes = this.allowedRecipes(plan, data);
		const limits = this.pool.effectiveLimits(plan);

		const producible = new Set<string>();
		data.resources.forEach(className => {
			if ((limits[className] ?? Infinity) > 0) {
				producible.add(className);
			}
		});
		lockedNodes.forEach(node => node.outputs.forEach(io => producible.add(io.item.className)));
		this.inputSources(plan, data).forEach(input => producible.add(input.item.className));

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

		return producible;
	}

	private optimisationTarget(plan: Plan, data: Data): OptimisationTarget
	{
		const settings = plan.settings.optimisation;
		const resourcesEnabled = settings?.rawResources ?? true;
		const powerEnabled = settings?.power ?? true;
		const machinesEnabled = settings?.machines ?? false;

		const rawResources = resourcesEnabled
			? this.resourceWeights.resolve(plan.settings, this.pool.effectiveLimits(plan), data)
			: {};

		return {
			rawResources,
			power: powerEnabled ? settings?.powerWeight ?? OptimisationDefaults.powerWeight : 0,
			machines: machinesEnabled ? settings?.machinesWeight ?? OptimisationDefaults.machinesWeight : 0,
			inputs: settings?.inputs ?? true,
		};
	}

	/** Augmenters are constants in the LP, not a column, so their node is restated from the settings after every solve. */
	private augmenterNodes(plan: Plan, data: Data): Node[]
	{
		const augmenters = this.extraPower.resolve(plan.settings).augmenters;
		const building = this.extraPower.augmenterBuilding(data);
		if (augmenters.count === 0 || building === null) {
			return [];
		}
		return [new AugmenterNode(
			crypto.randomUUID(),
			augmenters.count,
			augmenters.boosted,
			building,
			data.searchItemByClassName(SpecialClasses.AlienPowerMatrixItem) ?? null,
		)];
	}

	private sloopBudgetOf(plan: Plan): number
	{
		return Math.max(0, Math.round(plan.settings.maxSloops ?? 0));
	}

	private machineSloops(plan: Plan): number
	{
		const budget = this.sloopBudget.remaining(this.sloopBudgetOf(plan), plan.graph);
		return Math.max(0, budget - this.extraPower.resolve(plan.settings).sloopCost);
	}

	private powerDemand(plan: Plan): number
	{
		return plan.requests
			.filter(request => request.itemClassName === SpecialClasses.PowerTarget && (request.mode ?? 'rate') === 'rate')
			.reduce((sum, request) => sum + request.ratePerMinute, 0);
	}

	private sinkPointsDemand(plan: Plan): number
	{
		return plan.requests
			.filter(request => request.itemClassName === SpecialClasses.SinkPointsTarget && (request.mode ?? 'rate') === 'rate')
			.reduce((sum, request) => sum + request.ratePerMinute, 0);
	}

	private sinkableItems(plan: Plan, data: Data): Item[]
	{
		return (plan.settings.sinkableItems ?? [])
			.map(className => data.searchItemByClassName(className))
			.filter((item): item is Item => item !== undefined && item.isSinkable());
	}

	private allowedRecipes(plan: Plan, data: Data): Recipe[]
	{
		const enabled = this.enabledRecipes.resolve(plan.settings, data);
		return data.getRecipesForMachines().filter(recipe => enabled.has(recipe.className)
			&& !this.enabledRecipes.isDisabledByMachine(recipe, plan.settings));
	}

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

	private machineClockSpeeds(plan: Plan): Record<string, number>
	{
		const clocks: Record<string, number> = {};
		for (const entry of plan.settings.machineClockSpeeds ?? []) {
			if (entry.machineClassName !== '' && isFinite(entry.clockSpeed)) {
				clocks[entry.machineClassName] = Formulas.clampClock(entry.clockSpeed);
			}
		}
		return clocks;
	}

	private generatorClockSpeeds(plan: Plan): Record<string, number>
	{
		const clocks: Record<string, number> = {};
		for (const entry of plan.settings.generatorClockSpeeds ?? []) {
			if (entry.generatorClassName !== '' && isFinite(entry.clockSpeed)) {
				clocks[entry.generatorClassName] = Formulas.clampClock(entry.clockSpeed);
			}
		}
		return clocks;
	}

	private clockFor(request: SolverRequest, recipe: Recipe, machine: Building): number
	{
		return request.recipeClockSpeeds[recipe.className]
			?? request.machineClockSpeeds[machine.className]
			?? request.defaultClockSpeed;
	}

	private enabledGenerators(plan: Plan, data: Data): GeneratorFuelOption[]
	{
		const options: GeneratorFuelOption[] = [];
		// The default clock is for production machines only; applying it here would silently reshape every power plant.
		const clocks = this.generatorClockSpeeds(plan);
		Object.entries(plan.settings.enabledFuels ?? {}).forEach(([generatorClass, fuelClasses]) => {
			const generator = data.searchBuildingByClassName(generatorClass);
			if (!generator) return;
			const clockSpeed = generator.canOverclock ? clocks[generatorClass] ?? 100 : 100;
			fuelClasses.forEach(fuelClass => {
				const fuel = generator.fuel.find(f => f.item.className === fuelClass);
				if (fuel) {
					options.push({generator, fuel, clockSpeed});
				}
			});
		});
		return options;
	}

	private generatorVariableName(option: GeneratorFuelOption): string
	{
		return option.fuel.item.className + '@Gen%' + option.generator.className + '#' + option.clockSpeed;
	}

	/** LP names cannot contain hyphens, so the node's UUID is compacted. */
	private lockedVariableName(node: Node): string
	{
		return 'locked_' + node.id.replace(/-/g, '');
	}

	private buildLp(request: SolverRequest, data: Data, lockedNodes: Node[] = []): string
	{
		const lines: string[] = ['\\\\ Production Plan', 'Minimize'];

		if (request.maximise !== null) {
			// The optimisation goals are applied by the follow-up fixed-rate solve.
			lines.push('- 1 MaxRate');
		} else {
			// solve() guarantees at least one enabled goal.
			const optimisation: string[] = [];

			Object.keys(request.optimisation.rawResources).forEach(className => {
				if (request.optimisation.rawResources[className] > 0) {
					optimisation.push(request.optimisation.rawResources[className] + ' ' + className + '@Mine');
				}
			})

			if (request.optimisation.inputs) {
				request.inputs.forEach(input => {
					if (input.weight > 0) {
						optimisation.push(input.weight + ' ' + input.item.className + '@Input');
					}
				});
			}

			if (request.optimisation.power > 0 || request.optimisation.machines > 0) {
				request.recipes.forEach(recipe => {
					recipe.producedIn.forEach(machine => {
						const clockSpeed = this.clockFor(request, recipe, machine);
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
					request.generators.forEach(option =>
						optimisation.push(request.optimisation.machines + ' ' + this.generatorVariableName(option)));
				}
			}

			lines.push(optimisation.join('\n+ '));
		}

		lines.push('\nSubject To');

		const items: Map<string, string[]> = new Map();
		const add = (className: string, str: string) => {
			const arr = items.get(className) ?? [];
			arr.push(str);
			items.set(className, arr);
		};

		const sloopedRecipes: Map<string, number> = new Map();
		// Kept apart from draw: the augmenters' percentage only applies to the generation side.
		const generationTerms: {coefficient: number; variable: string}[] = [];
		const drawTerms: string[] = [];
		const factoryDrawFactor = request.producePowerForFactory ? 1 + request.excessPowerFraction : 0;

		request.recipes.forEach(recipe => {
			recipe.producedIn.forEach(machine => {
				const clockSpeed = this.clockFor(request, recipe, machine);
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
							drawTerms.push('- ' + (power * factoryDrawFactor) + ' ' + recipeClass);
						}
					}

					// TODO add machine count

					if (sloops > 0) {
						sloopedRecipes.set(recipeClass, sloops);
					}
				}
			});
		});

		request.generators.forEach(option => {
			const {generator, fuel, clockSpeed} = option;
			const varName = this.generatorVariableName(option);
			const burnRate = Formulas.generatorBurnRate(generator, fuel, clockSpeed);
			add(fuel.item.className, '- ' + burnRate + ' ' + varName);
			if (fuel.supplementalItem !== null) {
				add(fuel.supplementalItem.className, '- ' + Formulas.generatorSupplementalRate(generator, clockSpeed) + ' ' + varName);
			}
			if (fuel.byproduct !== null) {
				add(fuel.byproduct.className, '+ ' + (burnRate * fuel.byproductAmount) + ' ' + varName);
			}
			generationTerms.push({coefficient: Formulas.generatorPowerProduction(generator, 1, clockSpeed), variable: varName});
		});

		// Every raw resource gets a mine, whatever the goals: the weight map only prices them.
		data.resources.forEach(resourceClass => {
			add(resourceClass, '1 ' + resourceClass + '@Mine');
		})

		request.inputs.forEach(input => {
			add(input.item.className, '+ 1 ' + input.item.className + '@Input');
		});

		// Separate from @Input so the final graph can net carried byproducts against their source.
		request.carryInputs.forEach(input => {
			add(input.item.className, '+ 1 ' + input.item.className + '@Carry');
		});

		const sinkTerms: string[] = [];
		request.sinkableItems.forEach(item => {
			const varName = item.className + '@Sink';
			add(item.className, '- 1 ' + varName);
			sinkTerms.push('+ ' + Formulas.sinkPoints(item, 1) + ' ' + varName);
		});

		// Without a row an unproducible item's @Product variable floats free and the LP "produces" it out of nothing.
		request.productions.forEach(production => {
			if (!items.has(production.item.className)) {
				items.set(production.item.className, []);
			}
		});

		// Same for maximised items: an unproducible one then correctly pins MaxRate to 0.
		request.maximise?.items.forEach(item => {
			if (!items.has(item.className)) {
				items.set(item.className, []);
			}
		});

		lockedNodes.forEach(node => {
			const varName = this.lockedVariableName(node);
			node.inputs.forEach(io => add(io.item.className, '- ' + io.maxAmount + ' ' + varName));
			node.outputs.forEach(io => add(io.item.className, '+ ' + io.maxAmount + ' ' + varName));

			if (node instanceof GeneratorNode) {
				generationTerms.push({coefficient: node.powerProduction(), variable: varName});
			}

			if (factoryDrawFactor > 0) {
				if (node instanceof RecipeNode && node.averagePowerUsage() > 0) {
					drawTerms.push('- ' + (node.averagePowerUsage() * factoryDrawFactor) + ' ' + varName);
				} else if (node instanceof SubplanNode) {
					const power = this.breakdown.subplanPower(node.subplanId);
					const net = (power.consumption - power.production) * Math.max(1, node.buildCount);
					if (net > 0) {
						drawTerms.push('- ' + (net * factoryDrawFactor) + ' ' + varName);
					} else if (net < 0) {
						// Goes to the draw side: the subplan's own augmenters already boosted this, the parent's percentage must not apply again.
						drawTerms.push('+ ' + (-net) + ' ' + varName);
					}
				}
			}
		});

		// The matrix row is created even when nothing makes it, so the LP is infeasible instead of conjuring it.
		const constantDemands = new Map<string, number>();
		if (request.extraPower.matrixDemand > 0) {
			constantDemands.set(SpecialClasses.AlienPowerMatrixItem, request.extraPower.matrixDemand);
			if (!items.has(SpecialClasses.AlienPowerMatrixItem)) {
				items.set(SpecialClasses.AlienPowerMatrixItem, []);
			}
		}

		const byproducts: string[] = [];
		const disabledByproducts = new Set(request.disabledByproducts);

		items.forEach((usage, itemClass) => {
			lines.push('\\\\ ' + itemClass);
			lines.push(...usage)
			if (!disabledByproducts.has(itemClass)) {
				lines.push('- 1 ' + itemClass + '@Byproduct');
				byproducts.push(itemClass);
			}

			const item = data.getItemByClassName(itemClass);
			if (item && request.productions.some(production => production.item === item)) {
				lines.push('- 1 ' + itemClass + '@Product');
			}

			// Separate from @Product so an item can be fixed-rate and maximised at the same time.
			if (request.maximise?.items.some(maximised => maximised.className === itemClass)) {
				lines.push('- 1 ' + itemClass + '@Maximise');
			}

			lines.push(' = ' + (constantDemands.get(itemClass) ?? 0));
		});

		request.maximise?.items.forEach(item => {
			lines.push('\\\\ Maximise ' + item.className);
			lines.push(item.className + '@Maximise - 1 MaxRate = 0');
		});

		// Emitted whenever there is demand, so an uncoverable request (no generators) is infeasible rather than ignored.
		const extra = request.extraPower;
		const maximisePower = request.maximise?.category === 'power';
		const powerBalance = generationTerms.length > 0 || drawTerms.length > 0
			|| request.powerDemand > 0 || maximisePower || extra.isActive;
		if (powerBalance) {
			lines.push('\\\\ Power');
			generationTerms.forEach(term =>
				lines.push('+ ' + (term.coefficient * extra.multiplier) + ' ' + term.variable));
			lines.push(...drawTerms);
			lines.push('- 1 PowerSurplus');
			if (maximisePower) {
				lines.push('- 1 MaxRate');
			}
			const free = (extra.geothermalPower.average + extra.flatBonus) * extra.multiplier;
			lines.push(' = ' + (request.powerDemand - free));
		}

		// Same: emitted whenever there is demand, so an uncoverable request is infeasible.
		const maximiseSinkPoints = request.maximise?.category === 'sinkPoints';
		if (sinkTerms.length > 0 || request.sinkPointsDemand > 0 || maximiseSinkPoints) {
			lines.push('\\\\ SinkPoints');
			lines.push(...sinkTerms);
			lines.push('- 1 SinkPointsSurplus');
			if (maximiseSinkPoints) {
				lines.push('- 1 MaxRate');
			}
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

		lines.push('\nBounds');
		byproducts.forEach(byproduct => {
			lines.push(byproduct + '@Byproduct >= 0');
		});
		if (powerBalance) {
			lines.push('PowerSurplus >= 0');
		}
		if (sinkTerms.length > 0 || request.sinkPointsDemand > 0 || maximiseSinkPoints) {
			lines.push('SinkPointsSurplus >= 0');
		}

		request.productions.forEach(production => {
			lines.push(production.item.className + '@Product = ' + production.amount);
		});

		Object.entries(request.resourceLimits).forEach(([className, limit]) => {
			if (data.resources.includes(className)) {
				lines.push(className + '@Mine <= ' + limit);
			}
		});

		request.inputs.forEach(input => {
			lines.push(input.item.className + '@Input <= ' + input.amount);
		});

		request.carryInputs.forEach(input => {
			lines.push(input.item.className + '@Carry <= ' + input.amount);
		});

		lockedNodes.forEach(node => {
			lines.push(this.lockedVariableName(node) + ' = 1');
		});

		if (sloopedRecipes.size) {
			lines.push('\nGeneral');
			sloopedRecipes.forEach((value, key) => {
				lines.push(key + '_count');
			});
		}


		lines.push('End');

		return lines.join('\n');
	}

	private columnsOf(solution: HighsSolution): Map<string, number>
	{
		const columns = new Map<string, number>();
		(Object.values(solution.Columns) as unknown as {Primal: number, Name: string}[])
			// Snaps float dust; the grid must stay much finer than the warning tolerances,
			// since rounding each column independently unbalances items by rate × grid/2 per column.
			.forEach(column => columns.set(column.Name, Math.round(column.Primal * 1e9) / 1e9));
		return columns;
	}

	private parseSolution(solution: HighsSolution, data: Data, groupingMode: GroupingMode): SolverResponse
	{
		console.log('Objective: ', solution.ObjectiveValue);
		return {
			status: this.mapStatus(solution.Status),
			nodes: this.nodesFromColumns(this.columnsOf(solution), data, groupingMode),
		};
	}

	private nodesFromColumns(columns: Map<string, number>, data: Data, groupingMode: GroupingMode): Node[]
	{
		const kept = [...columns.entries()]
			.map(([Name, Primal]) => ({Name, Primal}))
			.filter(column => Math.abs(column.Primal) > 1e-6)
			.filter(column => !column.Name.endsWith('_count'))
			// Locked nodes pass through from the existing graph, never rebuilt.
			.filter(column => !column.Name.startsWith('locked_'))
			// Surpluses and the maximise loop's bookkeeping are not graph nodes (@Carry is netted into @Byproduct before parsing).
			.filter(column => column.Name !== 'PowerSurplus' && column.Name !== 'SinkPointsSurplus' && column.Name !== 'MaxRate')
			.filter(column => !column.Name.endsWith('@Carry'))
			// Byproduct slack picks up feasibility-tolerance noise that would render as "0.00/min" nodes.
			.filter(column => !(column.Name.endsWith('@Byproduct') && Math.abs(column.Primal) < 0.0005));

		return kept
			.map(column => {
				const id = crypto.randomUUID();
				const [recipeClass, type] = column.Name.split('@');
				if (type?.startsWith('Gen%')) {
					// The clock is absent in plans solved before generators could be overclocked.
					const [generatorClass, generatorClock] = type.slice(4).split('#');
					const generator = data.getBuildingByClassName(generatorClass);
					const fuel = generator.fuel.find(f => f.item.className === recipeClass)!;
					return new GeneratorNode(id, column.Primal, generator, fuel, generatorClock ? parseFloat(generatorClock) : 100);
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
					case 'Sink':
						return new SinkNode(id, column.Primal, data.getItemByClassName(recipeClass));
					default:
						const [machine, meta] = type.split('%');
						const [clockSpeed, sloops] = meta.split('#');
						const clock = parseFloat(clockSpeed);

						// The LP variable counts machines AT the column's clock; the target is machine-equivalents at 100%.
						const recipeNode = new RecipeNode(
							id,
							column.Primal * clock / 100,
							this.normalizer.generate(column.Primal, clock, parseInt(sloops), groupingMode),
							data.getBuildingByClassName(machine),
							data.getRecipeByClassName(recipeClass),
						);
						recipeNode.groupingMode = groupingMode;
						return recipeNode;
				}
			});
	}

	private solveMaximise(plan: Plan, data: Data, base: SolverRequest, maximise: MaximiseTarget, lockedNodes: Node[]): Observable<SolverResponse>
	{
		return new Observable<SolverResponse>(subscriber => {
			const run: SolveRunHandle = {cancelled: false, cancelCurrent: null};
			this.runMaximiseRounds(plan, data, base, maximise, lockedNodes, run)
				.then(response => {
					subscriber.next(response);
					subscriber.complete();
				})
				.catch((err: unknown) => {
					if (!run.cancelled) {
						subscriber.error(err);
					}
				});
			return () => {
				run.cancelled = true;
				run.cancelCurrent?.();
			};
		});
	}

	private async runMaximiseRounds(
		plan: Plan,
		data: Data,
		base: SolverRequest,
		maximise: MaximiseTarget,
		lockedNodes: Node[],
		run: SolveRunHandle,
	): Promise<SolverResponse>
	{
		const epsilon = ProductionSolverService.MAXIMISE_EPSILON;
		const specialKey = maximise.category === 'power' ? SpecialClasses.PowerTarget : SpecialClasses.SinkPointsTarget;
		const achieved: Record<string, number> = {};
		maximise.items.forEach(item => achieved[item.className] = 0);
		if (maximise.category !== 'items') {
			achieved[specialKey] = 0;
		}

		const merged = new Map<string, number>();
		let limits = {...base.resourceLimits};
		let inputs = base.inputs.map(input => ({...input}));
		let carries = new Map<string, number>();
		let sloops = base.maxSloops;
		let items = [...maximise.items];

		// Each round exhausts at least one binding constraint, so the cap only guards float slivers.
		const maxRounds = Math.max(4, items.length + 2);
		for (let round = 1; round <= maxRounds; round++) {
			const first = round === 1;
			// Fixed targets, demanded power/sink points and locked nodes are built exactly once, in the first round.
			const roundBase: SolverRequest = {
				...base,
				productions: first ? base.productions : [],
				// The percentage keeps applying to whatever later rounds generate.
				extraPower: first ? base.extraPower : base.extraPower.percentageOnly(),
				powerDemand: first ? base.powerDemand : 0,
				sinkPointsDemand: first ? base.sinkPointsDemand : 0,
				resourceLimits: limits,
				inputs,
				carryInputs: this.carrySources(carries, data),
				maxSloops: sloops,
			};
			const roundLocked = first ? lockedNodes : [];

			const maxRequest: SolverRequest = {...roundBase, maximise: {category: maximise.category, items}};
			const maxSolution = await this.awaitSolve(this.buildLp(maxRequest, data, roundLocked), this.solveOptions(maxRequest, plan), run);
			const maxStatus = this.mapStatus(maxSolution.Status);
			if (maxStatus === 'Unbounded') {
				throw new Error('There is no limit to how much can be made. Set raw resource limits in the Resources tab so that "as much as possible" is a real number.');
			}
			if (maxStatus !== 'Optimal') {
				if (first) {
					return {status: maxStatus, nodes: [], achievedMaximums: achieved};
				}
				break;
			}
			// Fixing slightly below the found maximum keeps the re-optimisation solve feasible despite float noise.
			const rate = Math.floor((this.columnsOf(maxSolution).get('MaxRate') ?? 0) * 1e6) / 1e6;
			if (!first && rate < epsilon) {
				break;
			}

			const fixRequest: SolverRequest = {
				...roundBase,
				productions: [...roundBase.productions, ...items.map(item => ({item, amount: rate}))],
				powerDemand: roundBase.powerDemand + (maximise.category === 'power' ? rate : 0),
				sinkPointsDemand: roundBase.sinkPointsDemand + (maximise.category === 'sinkPoints' ? rate : 0),
			};
			const fixSolution = await this.awaitSolve(this.buildLp(fixRequest, data, roundLocked), this.solveOptions(fixRequest, plan), run);
			const fixStatus = this.mapStatus(fixSolution.Status);
			if (fixStatus !== 'Optimal') {
				return {status: fixStatus, nodes: [], achievedMaximums: achieved};
			}

			items.forEach(item => achieved[item.className] += rate);
			if (maximise.category !== 'items') {
				achieved[specialKey] += rate;
			}

			const columns = this.columnsOf(fixSolution);
			columns.forEach((primal, name) => merged.set(name, (merged.get(name) ?? 0) + primal));
			({limits, inputs, sloops, carries} = this.leftoversAfter(columns, limits, inputs, sloops, carries));

			if (maximise.category === 'items') {
				const probeBase: SolverRequest = {
					...base,
					productions: [],
					extraPower: base.extraPower.percentageOnly(),
					powerDemand: 0,
					sinkPointsDemand: 0,
					resourceLimits: limits,
					inputs,
					carryInputs: this.carrySources(carries, data),
					maxSloops: 0,
				};
				items = await this.probeProducible(items, probeBase, data, run);
				if (items.length === 0) {
					break;
				}
			} else if (rate < epsilon) {
				break;
			}
		}

		this.netCarries(merged);
		return {
			status: 'Optimal',
			nodes: [
				...this.nodesFromColumns(merged, data, this.groupingModes.resolve(plan.settings)),
				...this.augmenterNodes(plan, data),
			],
			achievedMaximums: achieved,
		};
	}

	/** Somersloops never make an unproducible item producible, so the probes stay pure LPs. */
	private async probeProducible(items: Item[], probeBase: SolverRequest, data: Data, run: SolveRunHandle): Promise<Item[]>
	{
		const producible: Item[] = [];
		for (const item of items) {
			const request: SolverRequest = {...probeBase, maximise: {category: 'items', items: [item]}};
			const solution = await this.awaitSolve(this.buildLp(request, data, []), {}, run);
			if (this.mapStatus(solution.Status) === 'Optimal'
				&& (this.columnsOf(solution).get('MaxRate') ?? 0) >= ProductionSolverService.MAXIMISE_EPSILON) {
				producible.push(item);
			}
		}
		return producible;
	}

	private leftoversAfter(
		columns: Map<string, number>,
		limits: Record<string, number>,
		inputs: InputSource[],
		sloops: number,
		carries: Map<string, number>,
	): {limits: Record<string, number>; inputs: InputSource[]; sloops: number; carries: Map<string, number>}
	{
		const nextLimits = {...limits};
		const nextInputs = inputs.map(input => ({...input}));
		const nextCarries = new Map(carries);
		let usedSloops = 0;

		columns.forEach((primal, name) => {
			if (primal <= 0) {
				return;
			}
			if (name.endsWith('_count')) {
				const sloopCount = parseInt(name.slice(name.lastIndexOf('#') + 1), 10);
				if (isFinite(sloopCount)) {
					usedSloops += sloopCount * primal;
				}
				return;
			}
			const separator = name.indexOf('@');
			if (separator < 0) {
				return;
			}
			const itemClass = name.slice(0, separator);
			const kind = name.slice(separator + 1);
			if (kind === 'Mine' && nextLimits[itemClass] !== undefined) {
				nextLimits[itemClass] = Math.max(0, nextLimits[itemClass] - primal);
			} else if (kind === 'Input') {
				const input = nextInputs.find(source => source.item.className === itemClass);
				if (input) {
					input.amount = Math.max(0, input.amount - primal);
				}
			} else if (kind === 'Carry') {
				nextCarries.set(itemClass, Math.max(0, (nextCarries.get(itemClass) ?? 0) - primal));
			} else if (kind === 'Byproduct') {
				nextCarries.set(itemClass, (nextCarries.get(itemClass) ?? 0) + primal);
			}
		});

		return {
			limits: nextLimits,
			inputs: nextInputs.filter(input => input.amount > ProductionSolverService.MAXIMISE_EPSILON),
			sloops: Math.max(0, sloops - Math.round(usedSloops)),
			carries: nextCarries,
		};
	}

	private carrySources(carries: Map<string, number>, data: Data): InputSource[]
	{
		const sources: InputSource[] = [];
		carries.forEach((amount, className) => {
			const item = data.searchItemByClassName(className);
			if (item && amount > ProductionSolverService.MAXIMISE_EPSILON) {
				sources.push({item, amount, weight: 0});
			}
		});
		return sources;
	}

	/** A byproduct one round makes and a later one consumes is bookkeeping, not a real leftover. */
	private netCarries(columns: Map<string, number>): void
	{
		[...columns.keys()].filter(name => name.endsWith('@Carry')).forEach(name => {
			const itemClass = name.slice(0, name.indexOf('@'));
			const carried = columns.get(name) ?? 0;
			const byproductKey = itemClass + '@Byproduct';
			columns.set(byproductKey, Math.max(0, (columns.get(byproductKey) ?? 0) - carried));
			columns.delete(name);
		});
	}

	private awaitSolve(lp: string, options: {workerOptions?: SolverWorkerOptions; timeoutMs?: number}, run: SolveRunHandle): Promise<HighsSolution>
	{
		return new Promise<HighsSolution>((resolve, reject) => {
			if (run.cancelled) {
				reject(new Error('Calculation cancelled'));
				return;
			}
			const subscription = this.solver.solve(lp, options).subscribe({
				next: solution => {
					run.cancelCurrent = null;
					resolve(solution);
				},
				error: (err: unknown) => {
					run.cancelCurrent = null;
					reject(err instanceof Error ? err : new Error(String(err)));
				},
			});
			run.cancelCurrent = () => {
				subscription.unsubscribe();
				reject(new Error('Calculation cancelled'));
			};
		});
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
