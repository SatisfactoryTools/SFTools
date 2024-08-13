import {Injectable} from '@angular/core';
import {Building} from '@src/Model/Data/Entities/Building';
import {Item} from '@src/Model/Data/Entities/Item';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {BuildCostBreakdown} from '@src/Model/Planner/Breakdown/BuildCostBreakdown';
import {BuildCostMaterialRow} from '@src/Model/Planner/Breakdown/BuildCostMaterialRow';
import {BuildCostRow} from '@src/Model/Planner/Breakdown/BuildCostRow';
import {ItemFlowRow} from '@src/Model/Planner/Breakdown/ItemFlowRow';
import {ItemRow} from '@src/Model/Planner/Breakdown/ItemRow';
import {PowerBreakdown} from '@src/Model/Planner/Breakdown/PowerBreakdown';
import {PowerRow} from '@src/Model/Planner/Breakdown/PowerRow';
import {Formulas} from '@src/Model/Planner/Formulas';
import {Graph} from '@src/Model/Planner/Graph/Graph';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanNameResolver} from '@src/Model/Planner/PlanNameResolver';
import {PlanSerializer} from '@src/Model/Planner/PlanSerializer';
import {SubplanIOResolver} from '@src/Model/Planner/SubplanIOResolver';
import {ByproductNode} from '@src/Model/Planner/Solver/Response/ByproductNode';
import {GeneratorNode} from '@src/Model/Planner/Solver/Response/GeneratorNode';
import {InputNode} from '@src/Model/Planner/Solver/Response/InputNode';
import {MachineGroup} from '@src/Model/Planner/Solver/Response/MachineGroup';
import {MineNode} from '@src/Model/Planner/Solver/Response/MineNode';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {ProductNode} from '@src/Model/Planner/Solver/Response/ProductNode';
import {RecipeNode} from '@src/Model/Planner/Solver/Response/RecipeNode';
import {SinkNode} from '@src/Model/Planner/Solver/Response/SinkNode';
import {SubplanNode} from '@src/Model/Planner/Solver/Response/SubplanNode';
import {RateFormatter} from '@src/Model/RateFormatter';

/**
 * Aggregates a plan's graph into the summary panels' row models: power per
 * building type and recipe, item flows per item, and build cost per building.
 * Each subplan node contributes a single row summing the subplan's own graph
 * recursively - the subplan itself is where its details live.
 */
@Injectable({providedIn: 'root'})
export class PlanBreakdownService
{

	public constructor(
		private readonly planManager: PlanManager,
		private readonly planSerializer: PlanSerializer,
		private readonly subplanResolver: SubplanIOResolver,
		private readonly versionManager: VersionManager,
		private readonly planNames: PlanNameResolver,
		private readonly rateFormatter: RateFormatter,
	)
	{
	}

	public power(plan: Plan | null): PowerBreakdown
	{
		const graph = this.reviveGraph(plan?.graph ?? null);
		if (!plan || !graph) {
			return {rows: [], consumption: 0, production: 0};
		}

		const machines = new Map<string, {
			building: Building;
			machines: number;
			megawatts: number;
			entries: Map<string, {name: string; machines: number; megawatts: number; groups: MachineGroup[]}>;
		}>();
		const generators = new Map<string, {
			building: Building;
			machines: number;
			megawatts: number;
			entries: Map<string, {name: string; machines: number; megawatts: number}>;
		}>();
		const subplanNodes: SubplanNode[] = [];
		let consumption = 0;
		let production = 0;

		graph.nodes.forEach(node => {
			if (node instanceof RecipeNode) {
				const megawatts = node.averagePowerUsage();
				consumption += megawatts;
				const row = this.getOrCreate(machines, node.machine.className,
					() => ({building: node.machine, machines: 0, megawatts: 0, entries: new Map()}));
				row.machines += node.amount;
				row.megawatts += megawatts;
				const entry = this.getOrCreate(row.entries, node.recipe.className,
					() => ({name: node.recipe.name, machines: 0, megawatts: 0, groups: []}));
				entry.machines += node.amount;
				entry.megawatts += megawatts;
				entry.groups.push(...node.groups);
			} else if (node instanceof GeneratorNode) {
				const megawatts = node.powerProduction();
				production += megawatts;
				const row = this.getOrCreate(generators, node.generator.className,
					() => ({building: node.generator, machines: 0, megawatts: 0, entries: new Map()}));
				row.machines += node.amount;
				row.megawatts -= megawatts;
				const entry = this.getOrCreate(row.entries, node.fuel.item.className,
					() => ({name: node.fuel.item.name, machines: 0, megawatts: 0}));
				entry.machines += node.amount;
				entry.megawatts -= megawatts;
			} else if (node instanceof SubplanNode) {
				subplanNodes.push(node);
			}
		});

		const rows: PowerRow[] = [];

		this.sortedByBuildingName(machines).forEach(row => rows.push({
			key: row.building.className,
			name: row.building.name,
			kind: 'machine',
			machines: row.machines,
			megawatts: row.megawatts,
			entries: [...row.entries.entries()]
				.sort(([, a], [, b]) => a.name.localeCompare(b.name))
				.map(([key, entry]) => ({
					key,
					name: entry.name,
					machines: entry.machines,
					detail: this.groupsSummary(entry.groups),
					megawatts: entry.megawatts,
				})),
		}));

		this.sortedByBuildingName(generators).forEach(row => rows.push({
			key: row.building.className,
			name: row.building.name,
			kind: 'generator',
			machines: row.machines,
			megawatts: row.megawatts,
			entries: [...row.entries.entries()]
				.sort(([, a], [, b]) => a.name.localeCompare(b.name))
				.map(([key, entry]) => ({
					key,
					name: entry.name,
					machines: entry.machines,
					detail: '',
					megawatts: entry.megawatts,
				})),
		}));

		this.groupSubplans(subplanNodes).forEach(group => {
			const nodes = this.collectProductionNodes(group.subplanId, new Set([plan.id]));
			const subConsumption = nodes.recipes.reduce((sum, node) => sum + node.averagePowerUsage(), 0) * group.count;
			const subProduction = nodes.generators.reduce((sum, node) => sum + node.powerProduction(), 0) * group.count;
			consumption += subConsumption;
			production += subProduction;
			rows.push({
				key: `subplan:${group.subplanId}`,
				name: group.name,
				kind: 'subplan',
				machines: this.countMachines(nodes.recipes, nodes.generators) * group.count,
				megawatts: subConsumption - subProduction,
				entries: [],
			});
		});

		return {rows, consumption, production};
	}

	public items(plan: Plan | null): ItemRow[]
	{
		const graph = this.reviveGraph(plan?.graph ?? null);
		if (!graph) {
			return [];
		}

		const rows = new Map<string, {
			item: Item;
			sources: Map<string, {name: string; amount: number}>;
			targets: Map<string, {name: string; amount: number}>;
		}>();

		graph.nodes.forEach(node => {
			const flow = this.flowDescriptor(node);
			node.outputs.forEach(io => {
				const row = this.getOrCreate(rows, io.item.className,
					() => ({item: io.item, sources: new Map(), targets: new Map()}));
				const entry = this.getOrCreate(row.sources, flow.key, () => ({name: flow.name, amount: 0}));
				entry.amount += io.maxAmount;
			});
			node.inputs.forEach(io => {
				const row = this.getOrCreate(rows, io.item.className,
					() => ({item: io.item, sources: new Map(), targets: new Map()}));
				const entry = this.getOrCreate(row.targets, flow.key, () => ({name: flow.name, amount: 0}));
				entry.amount += io.maxAmount;
			});
		});

		return [...rows.values()]
			.sort((a, b) => a.item.name.localeCompare(b.item.name))
			.map(row => {
				const sources = this.toFlowRows(row.sources);
				const targets = this.toFlowRows(row.targets);
				const totalSources = sources.reduce((sum, flow) => sum + flow.amount, 0);
				const totalTargets = targets.reduce((sum, flow) => sum + flow.amount, 0);
				return {
					item: row.item,
					sources,
					targets,
					totalSources,
					totalTargets,
					net: totalSources - totalTargets,
				};
			});
	}

	public buildCost(plan: Plan | null): BuildCostBreakdown
	{
		const graph = this.reviveGraph(plan?.graph ?? null);
		if (!plan || !graph) {
			return {rows: [], machines: 0, shards: 0, sloops: 0, materials: []};
		}

		const recipes: RecipeNode[] = [];
		const generators: GeneratorNode[] = [];
		const subplanNodes: SubplanNode[] = [];
		graph.nodes.forEach(node => {
			if (node instanceof RecipeNode) {
				recipes.push(node);
			} else if (node instanceof GeneratorNode) {
				generators.push(node);
			} else if (node instanceof SubplanNode) {
				subplanNodes.push(node);
			}
		});

		const rows: BuildCostRow[] = this.machineCostRows(recipes, generators);

		this.groupSubplans(subplanNodes).forEach(group => {
			const nodes = this.collectProductionNodes(group.subplanId, new Set([plan.id]));
			const subRows = this.machineCostRows(nodes.recipes, nodes.generators);
			rows.push({
				key: `subplan:${group.subplanId}`,
				name: group.name,
				icon: null,
				kind: 'subplan',
				machines: subRows.reduce((sum, row) => sum + row.machines, 0) * group.count,
				shards: subRows.reduce((sum, row) => sum + row.shards, 0) * group.count,
				sloops: subRows.reduce((sum, row) => sum + row.sloops, 0) * group.count,
				materials: this.mergeMaterials(subRows.flatMap(row => row.materials))
					.map(material => ({item: material.item, amount: material.amount * group.count})),
			});
		});

		return {
			rows,
			machines: rows.reduce((sum, row) => sum + row.machines, 0),
			shards: rows.reduce((sum, row) => sum + row.shards, 0),
			sloops: rows.reduce((sum, row) => sum + row.sloops, 0),
			materials: this.mergeMaterials(rows.flatMap(row => row.materials)),
		};
	}

	/** Folder overview: one row per plan in the folder, each summed like a subplan row. */
	public powerForFolder(folderId: string): PowerBreakdown
	{
		const rows: PowerRow[] = [];
		let consumption = 0;
		let production = 0;

		this.folderPlans(folderId).forEach(plan => {
			const nodes = this.collectProductionNodes(plan.id, new Set());
			const planConsumption = nodes.recipes.reduce((sum, node) => sum + node.averagePowerUsage(), 0);
			const planProduction = nodes.generators.reduce((sum, node) => sum + node.powerProduction(), 0);
			consumption += planConsumption;
			production += planProduction;
			rows.push({
				key: plan.id,
				name: this.planNames.displayName(plan),
				kind: 'plan',
				machines: this.countMachines(nodes.recipes, nodes.generators),
				megawatts: planConsumption - planProduction,
				entries: [],
			});
		});

		return {rows, consumption, production};
	}

	/** Folder overview: each plan's outside interface (inputs needed, products/byproducts provided). */
	public itemsForFolder(folderId: string): ItemRow[]
	{
		const rows = new Map<string, {
			item: Item;
			sources: Map<string, {name: string; amount: number}>;
			targets: Map<string, {name: string; amount: number}>;
		}>();

		this.folderPlans(folderId).forEach(plan => {
			const io = this.subplanResolver.resolveGraph(plan.graph);
			const flow = {key: `plan:${plan.id}`, name: this.planNames.displayName(plan)};
			io.outputs.forEach(nodeIo => {
				const row = this.getOrCreate(rows, nodeIo.item.className,
					() => ({item: nodeIo.item, sources: new Map(), targets: new Map()}));
				const entry = this.getOrCreate(row.sources, flow.key, () => ({name: flow.name, amount: 0}));
				entry.amount += nodeIo.maxAmount;
			});
			io.inputs.forEach(nodeIo => {
				const row = this.getOrCreate(rows, nodeIo.item.className,
					() => ({item: nodeIo.item, sources: new Map(), targets: new Map()}));
				const entry = this.getOrCreate(row.targets, flow.key, () => ({name: flow.name, amount: 0}));
				entry.amount += nodeIo.maxAmount;
			});
		});

		return [...rows.values()]
			.sort((a, b) => a.item.name.localeCompare(b.item.name))
			.map(row => {
				const sources = this.toFlowRows(row.sources);
				const targets = this.toFlowRows(row.targets);
				const totalSources = sources.reduce((sum, flow) => sum + flow.amount, 0);
				const totalTargets = targets.reduce((sum, flow) => sum + flow.amount, 0);
				return {
					item: row.item,
					sources,
					targets,
					totalSources,
					totalTargets,
					net: totalSources - totalTargets,
				};
			});
	}

	/** Folder overview: one row per plan in the folder, expandable to its total materials. */
	public buildCostForFolder(folderId: string): BuildCostBreakdown
	{
		const rows: BuildCostRow[] = this.folderPlans(folderId).map(plan => {
			const nodes = this.collectProductionNodes(plan.id, new Set());
			const planRows = this.machineCostRows(nodes.recipes, nodes.generators);
			return {
				key: plan.id,
				name: this.planNames.displayName(plan),
				icon: null,
				kind: 'plan' as const,
				machines: planRows.reduce((sum, row) => sum + row.machines, 0),
				shards: planRows.reduce((sum, row) => sum + row.shards, 0),
				sloops: planRows.reduce((sum, row) => sum + row.sloops, 0),
				materials: this.mergeMaterials(planRows.flatMap(row => row.materials)),
			};
		});

		return {
			rows,
			machines: rows.reduce((sum, row) => sum + row.machines, 0),
			shards: rows.reduce((sum, row) => sum + row.shards, 0),
			sloops: rows.reduce((sum, row) => sum + row.sloops, 0),
			materials: this.mergeMaterials(rows.flatMap(row => row.materials)),
		};
	}

	/** Recursive power totals of a subplan, e.g. for the solver's factory-power balance. */
	public subplanPower(subplanId: string): {consumption: number; production: number}
	{
		const nodes = this.collectProductionNodes(subplanId, new Set());
		return {
			consumption: nodes.recipes.reduce((sum, node) => sum + node.averagePowerUsage(), 0),
			production: nodes.generators.reduce((sum, node) => sum + node.powerProduction(), 0),
		};
	}

	/** The folder's own plans (subplans belong to their parent plan's rows, not the folder). */
	private folderPlans(folderId: string): Plan[]
	{
		return this.planManager.plans()
			.filter(plan => plan.folderId === folderId && plan.parentPlanId === null)
			.sort((a, b) => a.name.localeCompare(b.name));
	}

	private machineCostRows(recipes: RecipeNode[], generators: GeneratorNode[]): BuildCostRow[]
	{
		const map = new Map<string, {building: Building; machines: number; shards: number; sloops: number}>();

		recipes.forEach(node => {
			const row = this.getOrCreate(map, node.machine.className,
				() => ({building: node.machine, machines: 0, shards: 0, sloops: 0}));
			node.groups.forEach(group => {
				row.machines += group.machines;
				row.shards += group.machines * Formulas.powerShards(group.clockSpeed);
				row.sloops += group.machines * group.sloops;
			});
		});

		generators.forEach(node => {
			const row = this.getOrCreate(map, node.generator.className,
				() => ({building: node.generator, machines: 0, shards: 0, sloops: 0}));
			// Generator counts are fractional at 100% clock - building them takes whole machines.
			row.machines += Math.ceil(node.amount - 1e-9);
		});

		return this.sortedByBuildingName(map).map(row => ({
			key: row.building.className,
			name: row.building.name,
			icon: row.building.icon,
			kind: 'machine' as const,
			machines: row.machines,
			shards: row.shards,
			sloops: row.sloops,
			materials: this.buildingMaterials(row.building, row.machines),
		}));
	}

	private buildingMaterials(building: Building, count: number): BuildCostMaterialRow[]
	{
		const recipe = this.versionManager.activeVersionData()?.searchBuildRecipeForBuilding(building.className);
		return (recipe?.ingredients ?? []).map(ingredient => ({
			item: ingredient.item,
			amount: ingredient.amount * count,
		}));
	}

	private mergeMaterials(materials: BuildCostMaterialRow[]): BuildCostMaterialRow[]
	{
		const merged = new Map<string, {item: Item; amount: number}>();
		materials.forEach(material => {
			const entry = this.getOrCreate(merged, material.item.className, () => ({item: material.item, amount: 0}));
			entry.amount += material.amount;
		});
		return [...merged.values()].sort((a, b) => a.item.name.localeCompare(b.item.name));
	}

	/**
	 * All machine and generator nodes reachable from the given plan, nested
	 * subplans included. The ancestors set carries the plan ids on the current
	 * path, so a corrupted cyclic reference terminates instead of recursing
	 * forever - while the same subplan used twice as siblings still counts twice.
	 */
	private collectProductionNodes(planId: string, ancestors: ReadonlySet<string>): {recipes: RecipeNode[]; generators: GeneratorNode[]}
	{
		const result: {recipes: RecipeNode[]; generators: GeneratorNode[]} = {recipes: [], generators: []};
		if (ancestors.has(planId)) {
			return result;
		}
		const plan = this.planManager.plans().find(p => p.id === planId) ?? null;
		const graph = this.reviveGraph(plan?.graph ?? null);
		if (!graph) {
			return result;
		}

		const path = new Set([...ancestors, planId]);
		graph.nodes.forEach(node => {
			if (node instanceof RecipeNode) {
				result.recipes.push(node);
			} else if (node instanceof GeneratorNode) {
				result.generators.push(node);
			} else if (node instanceof SubplanNode) {
				const nested = this.collectProductionNodes(node.subplanId, path);
				result.recipes.push(...nested.recipes);
				result.generators.push(...nested.generators);
			}
		});
		return result;
	}

	private countMachines(recipes: RecipeNode[], generators: GeneratorNode[]): number
	{
		return recipes.reduce((sum, node) => sum + node.amount, 0)
			+ generators.reduce((sum, node) => sum + Math.ceil(node.amount - 1e-9), 0);
	}

	/** Multiple nodes may reference the same subplan - one row each, scaled by occurrence count. */
	private groupSubplans(nodes: SubplanNode[]): {subplanId: string; name: string; count: number}[]
	{
		const groups = new Map<string, {subplanId: string; name: string; count: number}>();
		nodes.forEach(node => {
			const group = this.getOrCreate(groups, node.subplanId,
				() => ({subplanId: node.subplanId, name: node.name, count: 0}));
			group.count++;
		});
		return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
	}

	private flowDescriptor(node: Node): {key: string; name: string}
	{
		if (node instanceof RecipeNode) {
			return {key: `recipe:${node.recipe.className}:${node.machine.className}`, name: node.recipe.name};
		}
		if (node instanceof GeneratorNode) {
			return {key: `generator:${node.generator.className}`, name: node.generator.name};
		}
		if (node instanceof SubplanNode) {
			return {key: `subplan:${node.subplanId}`, name: `Subplan: ${node.name}`};
		}
		if (node instanceof SinkNode) {
			return {key: 'sink', name: 'AWESOME Sink'};
		}
		if (node instanceof MineNode) {
			return {key: 'mine', name: 'Resource extraction'};
		}
		if (node instanceof InputNode) {
			return {key: 'input', name: 'Manual input'};
		}
		if (node instanceof ProductNode) {
			return {key: 'product', name: 'Production target'};
		}
		if (node instanceof ByproductNode) {
			return {key: 'byproduct', name: 'Byproduct'};
		}
		return {key: node.type, name: node.getDisplayName()};
	}

	private toFlowRows(entries: Map<string, {name: string; amount: number}>): ItemFlowRow[]
	{
		return [...entries.entries()]
			.map(([key, entry]) => ({key, name: entry.name, amount: entry.amount}))
			.sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
	}

	/** Machine group summary like "2@100% + 1@50%+1S"; identical groups merge first. */
	private groupsSummary(groups: MachineGroup[]): string
	{
		const merged = new Map<string, {machines: number; clockSpeed: number; sloops: number}>();
		groups.forEach(group => {
			const entry = this.getOrCreate(merged, `${group.clockSpeed}|${group.sloops}`,
				() => ({machines: 0, clockSpeed: group.clockSpeed, sloops: group.sloops}));
			entry.machines += group.machines;
		});
		return [...merged.values()]
			.sort((a, b) => b.clockSpeed - a.clockSpeed)
			.map(group => `${group.machines}@${this.rateFormatter.clock(group.clockSpeed)}%${group.sloops > 0 ? `+${group.sloops}S` : ''}`)
			.join(' + ');
	}

	private sortedByBuildingName<T extends {building: Building}>(map: Map<string, T>): T[]
	{
		return [...map.values()].sort((a, b) => a.building.name.localeCompare(b.building.name));
	}

	/** Panels may see a graph parsed straight from storage - hydrate defensively. */
	private reviveGraph(graph: Graph | null): Graph | null
	{
		if (!graph) {
			return null;
		}
		try {
			return this.planSerializer.reviveGraph(graph);
		} catch {
			return null;
		}
	}

	private getOrCreate<K, V>(map: Map<K, V>, key: K, factory: () => V): V
	{
		let value = map.get(key);
		if (value === undefined) {
			value = factory();
			map.set(key, value);
		}
		return value;
	}

}
