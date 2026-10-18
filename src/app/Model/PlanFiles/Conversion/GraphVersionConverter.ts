import {Injectable} from '@angular/core';
import {Building} from '@src/Model/Data/Entities/Building';
import {Formulas} from '@src/Model/Planner/Formulas';
import {Graph} from '@src/Model/Planner/Graph/Graph';
import {GraphEdge} from '@src/Model/Planner/Graph/GraphEdge';
import {MachineGroup} from '@src/Model/Planner/Solver/Response/MachineGroup';
import {ImportIssueCollector} from '@src/Model/PlanFiles/Conversion/ImportIssueCollector';
import {RecipeChangeDetector} from '@src/Model/PlanFiles/Conversion/RecipeChangeDetector';
import {VersionConversionContext} from '@src/Model/PlanFiles/Conversion/VersionConversionContext';

type RawNode = Record<string, unknown>;

/**
 * Works on the stored (raw) graph: reviving needs every class to exist, which is exactly what is not guaranteed here.
 * Kept nodes keep their built machines; their rates follow the new recipe, so the plan is flagged for recalculation.
 */
@Injectable({providedIn: 'root'})
export class GraphVersionConverter
{

	private static readonly itemNodeLabels: Record<string, string> = {
		mine: 'resource',
		input: 'input',
		product: 'product',
		byproduct: 'byproduct',
		sink: 'sink',
	};

	public constructor(private readonly recipeChanges: RecipeChangeDetector)
	{
	}

	public convert(graph: Graph, context: VersionConversionContext, issues: ImportIssueCollector): {graph: Graph; changed: boolean}
	{
		const removed = new Set<string>();
		// Changed recipes may have lost ingredients or products; connections carrying those must go.
		const allowedItems = new Map<string, {inputs: Set<string>; outputs: Set<string>}>();
		let changed = false;

		const nodes: RawNode[] = [];
		for (const raw of (graph.nodes as unknown as RawNode[])) {
			const result = this.convertNode(raw, context, issues);
			if (result === null) {
				removed.add(raw['id'] as string);
				changed = true;
				continue;
			}
			changed ||= result.changed;
			if (result.allowed !== null) {
				allowedItems.set(raw['id'] as string, result.allowed);
			}
			nodes.push(result.node);
		}

		let unusedConnections = 0;
		const edges = (graph.edges ?? []).filter((edge: GraphEdge) => {
			if (removed.has(edge.sourceId) || removed.has(edge.targetId) || !context.target.searchItemByClassName(edge.itemClassName)) {
				return false;
			}
			const source = allowedItems.get(edge.sourceId);
			const target = allowedItems.get(edge.targetId);
			if ((source && !source.outputs.has(edge.itemClassName)) || (target && !target.inputs.has(edge.itemClassName))) {
				unusedConnections++;
				return false;
			}
			return true;
		});
		if (unusedConnections > 0) {
			issues.warn(`Removed ${unusedConnections} ${unusedConnections === 1 ? 'connection' : 'connections'} carrying items the changed recipes no longer use`);
			changed = true;
		}
		if (edges.length !== (graph.edges ?? []).length) {
			changed = true;
		}

		return {graph: {...graph, nodes: nodes as unknown as Graph['nodes'], edges}, changed};
	}

	private convertNode(
		raw: RawNode,
		context: VersionConversionContext,
		issues: ImportIssueCollector,
	): {node: RawNode; changed: boolean; allowed: {inputs: Set<string>; outputs: Set<string>} | null} | null
	{
		switch (raw['type']) {
			case 'recipe':
				return this.convertRecipeNode(raw, context, issues);
			case 'generator':
				return this.convertGeneratorNode(raw, context, issues);
			case 'augmenter': {
				const className = raw['buildingClassName'] as string;
				if (!context.target.searchBuildingByClassName(className)) {
					issues.warn(`Removed node: ${context.buildingName(className)} - the building no longer exists`);
					return null;
				}
				return {node: raw, changed: false, allowed: null};
			}
			case 'subplan':
				// The subplan's own conversion decides its IO; the node is refreshed from it when the plan opens.
				return {node: {...raw, inputs: this.knownIO(raw['inputs'], context), outputs: this.knownIO(raw['outputs'], context)}, changed: false, allowed: null};
			case 'mine':
			case 'input':
			case 'product':
			case 'byproduct':
			case 'sink': {
				// The pre-rework aggregate sink node stored an `items` array.
				const className = (raw['itemClassName'] as string | undefined)
					?? (raw['items'] as {itemClassName: string}[] | undefined)?.[0]?.itemClassName;
				if (className === undefined || !context.hasItem(className)) {
					const name = className === undefined ? 'unknown item' : context.itemName(className);
					issues.warn(`Removed node: ${name} (${GraphVersionConverter.itemNodeLabels[raw['type'] as string]}) - the item no longer exists`);
					return null;
				}
				return {node: raw, changed: false, allowed: null};
			}
			default:
				issues.warn(`Removed a node of an unknown type "${String(raw['type'])}"`);
				return null;
		}
	}

	private convertRecipeNode(
		raw: RawNode,
		context: VersionConversionContext,
		issues: ImportIssueCollector,
	): {node: RawNode; changed: boolean; allowed: {inputs: Set<string>; outputs: Set<string>} | null} | null
	{
		const recipeClassName = raw['recipeClassName'] as string;
		const recipe = context.target.searchRecipeByClassName(recipeClassName);
		if (!recipe) {
			issues.warn(`Removed node: ${context.recipeName(recipeClassName)} - the recipe no longer exists`);
			return null;
		}

		// Hydration tolerates dangling building references (mods).
		const machines = recipe.producedIn.filter(building => building !== undefined);
		const machineClassName = raw['machineClassName'] as string;
		let machine = machines.find(building => building.className === machineClassName);
		let node: RawNode = raw;
		let changed = false;
		let swapped = false;

		if (!machine) {
			if (machines.length === 0) {
				issues.warn(`Removed node: ${recipe.name} - no machine makes this recipe any more`);
				return null;
			}
			machine = machines[0];
			node = {...node, machineClassName: machine.className};
			issues.warn(`Machine changed: ${recipe.name} is now made in ${machine.name} instead of ${context.buildingName(machineClassName)} - machine counts kept`);
			changed = swapped = true;
		}

		let allowed: {inputs: Set<string>; outputs: Set<string>} | null = null;
		const sourceRecipe = context.source?.searchRecipeByClassName(recipeClassName);
		const sourceMachine = context.source?.searchBuildingByClassName(machineClassName);
		if (sourceRecipe) {
			const changes = this.recipeChanges.changes(sourceRecipe, recipe);
			if (changes.length > 0) {
				issues.warn(`Recipe changed: ${recipe.name} (${changes.join(', ')}) - machine counts kept`);
				changed = true;
				allowed = {
					inputs: new Set(recipe.ingredients.map(entry => entry.item?.className)),
					outputs: new Set(recipe.products.map(entry => entry.item?.className)),
				};
			}
			if (this.recipeChanges.powerDiffers(sourceRecipe, recipe)) {
				issues.info(`Power use changed: ${recipe.name}`);
			}
		}
		if (sourceMachine && !swapped) {
			if (VersionConversionContext.differs(sourceMachine.manufacturingSpeed, machine.manufacturingSpeed)) {
				issues.warn(`Machine speed changed: ${machine.name} - machine counts kept`);
				changed = true;
			}
			if (VersionConversionContext.differs(sourceMachine.powerUsage, machine.powerUsage)
				|| VersionConversionContext.differs(sourceMachine.powerUsageExponent, machine.powerUsageExponent)) {
				issues.info(`Power use changed: ${machine.name}`);
			}
		}

		// Only re-fitted when the limits may have moved: the data is not trusted to describe every machine's limits fully.
		if (Array.isArray(node['groups']) && (swapped || (sourceMachine !== undefined && this.limitsDiffer(sourceMachine, machine)))) {
			const groups = node['groups'] as MachineGroup[];
			const fitted = groups.map(group => this.fitGroup(group, machine));
			if (fitted.some((group, index) => group !== groups[index])) {
				node = {...node, groups: fitted};
				issues.warn(`Clock speeds or Somersloops adjusted to the limits of ${machine.name}`);
				changed = true;
			}
		}

		return {node, changed, allowed};
	}

	private convertGeneratorNode(
		raw: RawNode,
		context: VersionConversionContext,
		issues: ImportIssueCollector,
	): {node: RawNode; changed: boolean; allowed: null} | null
	{
		const generatorClassName = raw['generatorClassName'] as string;
		const fuelClassName = raw['fuelItemClassName'] as string;
		const generator = context.target.searchBuildingByClassName(generatorClassName);
		if (!generator) {
			issues.warn(`Removed node: ${context.buildingName(generatorClassName)} - the generator no longer exists`);
			return null;
		}
		const fuel = generator.fuel.find(candidate => candidate.item?.className === fuelClassName);
		if (!fuel) {
			issues.warn(`Removed node: ${generator.name} - it no longer burns ${context.itemName(fuelClassName)}`);
			return null;
		}

		let node: RawNode = raw;
		let changed = false;
		const sourceGenerator = context.source?.searchBuildingByClassName(generatorClassName);
		const sourceFuel = sourceGenerator?.fuel.find(candidate => candidate.item?.className === fuelClassName);
		if (sourceGenerator && sourceFuel) {
			const fuelUseChanged = VersionConversionContext.differs(Formulas.generatorBurnRate(sourceGenerator, sourceFuel), Formulas.generatorBurnRate(generator, fuel))
				|| VersionConversionContext.differs(Formulas.generatorSupplementalRate(sourceGenerator), Formulas.generatorSupplementalRate(generator))
				|| VersionConversionContext.differs(sourceFuel.byproductAmount ?? 0, fuel.byproductAmount ?? 0)
				|| sourceFuel.byproduct?.className !== fuel.byproduct?.className
				|| sourceFuel.supplementalItem?.className !== fuel.supplementalItem?.className;
			if (fuelUseChanged) {
				issues.warn(`Fuel use changed: ${generator.name} burning ${fuel.item.name} - generator count kept`);
				changed = true;
			}
			if (VersionConversionContext.differs(sourceGenerator.powerProduction, generator.powerProduction)) {
				issues.info(`Power output changed: ${generator.name}`);
			}
			const clockSpeed = raw['clockSpeed'] as number | undefined;
			if (clockSpeed !== undefined && this.limitsDiffer(sourceGenerator, generator)) {
				const fitted = this.fitClock(clockSpeed, generator);
				if (fitted !== clockSpeed) {
					node = {...node, clockSpeed: fitted};
					issues.warn(`Clock speed adjusted to the limits of ${generator.name}`);
					changed = true;
				}
			}
		}
		return {node, changed, allowed: null};
	}

	private knownIO(raw: unknown, context: VersionConversionContext): {itemClassName: string; amount: number}[]
	{
		return ((raw as {itemClassName: string; amount: number}[] | undefined) ?? [])
			.filter(io => context.target.searchItemByClassName(io.itemClassName) !== undefined);
	}

	private limitsDiffer(source: Building, target: Building): boolean
	{
		return source.canOverclock !== target.canOverclock
			|| VersionConversionContext.differs(source.minOverclock, target.minOverclock)
			|| VersionConversionContext.differs(source.maxOverclock, target.maxOverclock)
			|| source.canSloop !== target.canSloop
			|| source.sloopSlots !== target.sloopSlots;
	}

	/** Same instance when nothing had to change, so the caller can tell. */
	private fitGroup(group: MachineGroup, machine: Building): MachineGroup
	{
		const clockSpeed = this.fitClock(group.clockSpeed, machine);
		const current = group.sloops ?? 0;
		const sloops = Math.min(current, machine.canSloop ? machine.sloopSlots : 0);
		return clockSpeed === group.clockSpeed && sloops === current ? group : {...group, clockSpeed, sloops};
	}

	private fitClock(clockSpeed: number, machine: Building): number
	{
		if (!machine.canOverclock) {
			return 100;
		}
		return Math.min(Math.max(clockSpeed, machine.minOverclock), machine.maxOverclock);
	}

}
