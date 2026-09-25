import {Injectable} from '@angular/core';
import {Building} from '@src/Model/Data/Entities/Building';
import {Item} from '@src/Model/Data/Entities/Item';
import {Recipe} from '@src/Model/Data/Entities/Recipe';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {BuildCostBreakdown} from '@src/Model/Planner/Breakdown/BuildCostBreakdown';
import {BuildCostMaterialRow} from '@src/Model/Planner/Breakdown/BuildCostMaterialRow';
import {BuildCostRow} from '@src/Model/Planner/Breakdown/BuildCostRow';
import {CountedExtraPower} from '@src/Model/Planner/Breakdown/CountedExtraPower';
import {CountedNode} from '@src/Model/Planner/Breakdown/CountedNode';
import {ItemFlowRow} from '@src/Model/Planner/Breakdown/ItemFlowRow';
import {ItemRow} from '@src/Model/Planner/Breakdown/ItemRow';
import {PowerBreakdown} from '@src/Model/Planner/Breakdown/PowerBreakdown';
import {PowerEntryRow} from '@src/Model/Planner/Breakdown/PowerEntryRow';
import {PowerRow} from '@src/Model/Planner/Breakdown/PowerRow';
import {ProductionNodes} from '@src/Model/Planner/Breakdown/ProductionNodes';
import {ProductionRow} from '@src/Model/Planner/Breakdown/ProductionRow';
import {RecipeUsageRow} from '@src/Model/Planner/Breakdown/RecipeUsageRow';
import {ResourceUsageRow} from '@src/Model/Planner/Breakdown/ResourceUsageRow';
import {ExtraPower} from '@src/Model/Planner/ExtraPower';
import {ExtraPowerResolver} from '@src/Model/Planner/ExtraPowerResolver';
import {Formulas} from '@src/Model/Planner/Formulas';
import {GeothermalGenerators} from '@src/Model/Planner/GeothermalGenerators';
import {Graph} from '@src/Model/Planner/Graph/Graph';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanNameResolver} from '@src/Model/Planner/PlanNameResolver';
import {PlanSerializer} from '@src/Model/Planner/PlanSerializer';
import {PowerDraw} from '@src/Model/Planner/PowerDraw';
import {SpecialClasses} from '@src/Model/Planner/SpecialClasses';
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
 * recursively - the subplan itself is where its details live. A subplan node
 * built several times counts that many times everywhere.
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
		private readonly extraPower: ExtraPowerResolver,
	)
	{
	}

	public power(plan: Plan | null): PowerBreakdown
	{
		const graph = this.reviveGraph(plan?.graph ?? null);
		if (!plan || !graph) {
			return {rows: [], consumption: PowerDraw.ZERO, production: 0, net: PowerDraw.ZERO};
		}

		const machines = new Map<string, {
			building: Building;
			machines: number;
			power: PowerDraw;
			entries: Map<string, {name: string; machines: number; power: PowerDraw; groups: MachineGroup[]}>;
		}>();
		const generators = new Map<string, {
			building: Building;
			machines: number;
			power: PowerDraw;
			entries: Map<string, {name: string; machines: number; power: PowerDraw}>;
		}>();
		const subplanNodes: SubplanNode[] = [];
		let consumption = PowerDraw.ZERO;
		let production = PowerDraw.ZERO;

		graph.nodes.forEach(node => {
			if (node instanceof RecipeNode) {
				const power = node.powerDraw();
				consumption = consumption.add(power);
				const row = this.getOrCreate(machines, node.machine.className,
					() => ({building: node.machine, machines: 0, power: PowerDraw.ZERO, entries: new Map()}));
				row.machines += node.amount;
				row.power = row.power.add(power);
				const entry = this.getOrCreate(row.entries, node.recipe.className,
					() => ({name: node.recipe.name, machines: 0, power: PowerDraw.ZERO, groups: []}));
				entry.machines += node.amount;
				entry.power = entry.power.add(power);
				entry.groups.push(...node.groups);
			} else if (node instanceof GeneratorNode) {
				const megawatts = node.powerProduction();
				production = production.add(PowerDraw.fixed(megawatts));
				const row = this.getOrCreate(generators, node.generator.className,
					() => ({building: node.generator, machines: 0, power: PowerDraw.ZERO, entries: new Map()}));
				row.machines += node.amount;
				row.power = row.power.subtract(PowerDraw.fixed(megawatts));
				const entry = this.getOrCreate(row.entries, node.fuel.item.className,
					() => ({name: node.fuel.item.name, machines: 0, power: PowerDraw.ZERO}));
				entry.machines += node.amount;
				entry.power = entry.power.subtract(PowerDraw.fixed(megawatts));
			} else if (node instanceof SubplanNode) {
				subplanNodes.push(node);
			}
		});

		const rows: PowerRow[] = [];

		this.sortedByBuildingName(machines).forEach(row => rows.push({
			key: row.building.className,
			name: row.building.name,
			icon: row.building.icon,
			kind: 'machine',
			machines: row.machines,
			power: row.power,
			entries: [...row.entries.entries()]
				.sort(([, a], [, b]) => a.name.localeCompare(b.name))
				.map(([key, entry]) => ({
					key,
					name: entry.name,
					machines: entry.machines,
					detail: this.groupsSummary(entry.groups),
					power: entry.power,
				})),
		}));

		this.sortedByBuildingName(generators).forEach(row => rows.push({
			key: row.building.className,
			name: row.building.name,
			icon: row.building.icon,
			kind: 'generator',
			machines: row.machines,
			power: row.power,
			entries: [...row.entries.entries()]
				.sort(([, a], [, b]) => a.name.localeCompare(b.name))
				.map(([key, entry]) => ({
					key,
					name: entry.name,
					machines: entry.machines,
					detail: '',
					power: entry.power,
				})),
		}));

		// Geothermal generators and alien power augmenters are settings rather
		// than graph nodes; the augmenters' percentage applies to what this
		// plan's own generators make, so the rows come after them.
		const extraRows = this.extraPowerRows(plan, production.average);
		rows.push(...extraRows.rows);
		production = production.add(extraRows.production);

		this.groupSubplans(subplanNodes).forEach(group => {
			const nodes = this.collectProductionNodes(group.subplanId, new Set([plan.id]));
			const subConsumption = this.consumptionOf(nodes.recipes).scale(group.count);
			const subProduction = this.productionOf(nodes).scale(group.count);
			consumption = consumption.add(subConsumption);
			production = production.add(subProduction);
			rows.push({
				key: `subplan:${group.subplanId}`,
				name: this.subplanRowName(group),
				icon: null,
				kind: 'subplan',
				machines: this.countMachines(nodes) * group.count,
				power: subConsumption.subtract(subProduction),
				entries: [],
			});
		});

		return {rows, consumption, production: production.average, net: production.subtract(consumption)};
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

		// Build cost only counts buildings, so what the generators make (the
		// augmenters' percentage base) does not matter here.
		const own: ProductionNodes = {recipes: [], generators: [], mines: [], extraPower: this.extraPowerEntries(plan, 0)};
		const subplanNodes: SubplanNode[] = [];
		graph.nodes.forEach(node => {
			if (node instanceof RecipeNode) {
				own.recipes.push({node, count: 1});
			} else if (node instanceof GeneratorNode) {
				own.generators.push({node, count: 1});
			} else if (node instanceof SubplanNode) {
				subplanNodes.push(node);
			}
		});

		const rows: BuildCostRow[] = this.machineCostRows(own);

		this.groupSubplans(subplanNodes).forEach(group => {
			const nodes = this.collectProductionNodes(group.subplanId, new Set([plan.id]));
			const subRows = this.machineCostRows(nodes);
			rows.push({
				key: `subplan:${group.subplanId}`,
				name: this.subplanRowName(group),
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

	/**
	 * Overview: every raw resource of the version alphabetically - used or not -
	 * with the plan's extraction rate (nested subplans included) and its own
	 * mining cap. Resources are extracted at the plan's mine nodes, so an
	 * unsolved plan simply reads as unused.
	 */
	public resources(plan: Plan | null): ResourceUsageRow[]
	{
		const data = this.versionManager.activeVersionData();
		if (!plan || !data) {
			return [];
		}

		const used = new Map<string, number>();
		this.collectProductionNodes(plan.id, new Set()).mines.forEach(entry => {
			const item = entry.node.item.className;
			used.set(item, (used.get(item) ?? 0) + entry.node.amount * entry.count);
		});
		const limits = plan.settings.resourceLimits ?? {};
		const disabled = new Set(plan.settings.disabledResources ?? []);

		return data.resources
			.map(className => data.searchItemByClassName(className))
			.filter((item): item is Item => item !== undefined)
			.sort((a, b) => a.name.localeCompare(b.name))
			.map(item => ({
				item,
				used: used.get(item.className) ?? 0,
				limit: limits[item.className] ?? null,
				disabled: disabled.has(item.className),
			}));
	}

	/** Overview: what leaves the plan - requested products first, then byproducts, each alphabetical. */
	public production(plan: Plan | null): ProductionRow[]
	{
		const graph = this.reviveGraph(plan?.graph ?? null);
		if (!graph) {
			return [];
		}

		const rows = new Map<string, {item: Item; kind: 'product' | 'byproduct'; amount: number}>();
		graph.nodes.forEach(node => {
			if (!(node instanceof ProductNode) && !(node instanceof ByproductNode)) {
				return;
			}
			const kind = node instanceof ProductNode ? 'product' : 'byproduct';
			const row = this.getOrCreate(rows, `${kind}:${node.item.className}`, () => ({item: node.item, kind, amount: 0}));
			row.amount += node.amount;
		});

		return [...rows.values()].sort((a, b) =>
			(a.kind === b.kind ? 0 : a.kind === 'product' ? -1 : 1) || a.item.name.localeCompare(b.item.name));
	}

	/** Overview: recipes in use with their machine counts, nested subplans included. */
	public recipes(plan: Plan | null): RecipeUsageRow[]
	{
		if (!plan) {
			return [];
		}

		const rows = new Map<string, {recipe: Recipe; machines: number}>();
		this.collectProductionNodes(plan.id, new Set()).recipes.forEach(entry => {
			const row = this.getOrCreate(rows, entry.node.recipe.className,
				() => ({recipe: entry.node.recipe, machines: 0}));
			row.machines += entry.node.amount * entry.count;
		});

		return [...rows.values()].sort((a, b) => a.recipe.name.localeCompare(b.recipe.name));
	}

	/** Folder overview: one row per plan in the folder, each summed like a subplan row. */
	public powerForFolder(folderId: string): PowerBreakdown
	{
		const rows: PowerRow[] = [];
		let consumption = PowerDraw.ZERO;
		let production = PowerDraw.ZERO;

		this.folderPlans(folderId).forEach(plan => {
			const nodes = this.collectProductionNodes(plan.id, new Set());
			const planConsumption = this.consumptionOf(nodes.recipes);
			const planProduction = this.productionOf(nodes);
			consumption = consumption.add(planConsumption);
			production = production.add(planProduction);
			rows.push({
				key: plan.id,
				name: this.planNames.displayName(plan),
				icon: null,
				kind: 'plan',
				machines: this.countMachines(nodes),
				power: planConsumption.subtract(planProduction),
				entries: [],
			});
		});

		return {rows, consumption, production: production.average, net: production.subtract(consumption)};
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
			const planRows = this.machineCostRows(nodes);
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

	/**
	 * Per-building-type rows of everything the plan builds, nested subplans
	 * folded into the building rows instead of one summary row each - for
	 * views that sum several plans by building.
	 */
	public buildingsRecursive(plan: Plan): BuildCostRow[]
	{
		const nodes = this.collectProductionNodes(plan.id, new Set());
		return this.machineCostRows(nodes);
	}

	/** Recursive power totals of a subplan, e.g. for the solver's factory-power balance. */
	public subplanPower(subplanId: string): {consumption: number; production: number}
	{
		const nodes = this.collectProductionNodes(subplanId, new Set());
		return {
			consumption: this.consumptionOf(nodes.recipes).average,
			production: this.productionOf(nodes).average,
		};
	}

	private consumptionOf(recipes: CountedNode<RecipeNode>[]): PowerDraw
	{
		return PowerDraw.sum(recipes.map(entry => entry.node.powerDraw().scale(entry.count)));
	}

	/**
	 * Everything a collection generates: its generator nodes plus, per plan
	 * on the way down, that plan's geothermal power and augmenter bonus.
	 */
	private productionOf(nodes: ProductionNodes): PowerDraw
	{
		const generators = nodes.generators.reduce((sum, entry) => sum + entry.node.powerProduction() * entry.count, 0);
		const extra = nodes.extraPower.map(entry => entry.extraPower.bonus(entry.generated).scale(entry.count));
		return PowerDraw.sum([PowerDraw.fixed(generators), ...extra]);
	}

	/** The folder's own plans (subplans belong to their parent plan's rows, not the folder). */
	private folderPlans(folderId: string): Plan[]
	{
		return this.planManager.plans()
			.filter(plan => plan.folderId === folderId && plan.parentPlanId === null)
			.sort((a, b) => a.name.localeCompare(b.name));
	}

	private machineCostRows(nodes: ProductionNodes): BuildCostRow[]
	{
		const map = new Map<string, {building: Building; machines: number; shards: number; sloops: number}>();
		const {recipes, generators} = nodes;

		recipes.forEach(entry => {
			const row = this.getOrCreate(map, entry.node.machine.className,
				() => ({building: entry.node.machine, machines: 0, shards: 0, sloops: 0}));
			entry.node.groups.forEach(group => {
				row.machines += group.machines * entry.count;
				row.shards += group.machines * Formulas.powerShards(group.clockSpeed) * entry.count;
				row.sloops += group.machines * group.sloops * entry.count;
			});
		});

		generators.forEach(entry => {
			const row = this.getOrCreate(map, entry.node.generator.className,
				() => ({building: entry.node.generator, machines: 0, shards: 0, sloops: 0}));
			// Generator counts are fractional - building them takes whole machines.
			row.machines += entry.node.wholeGenerators() * entry.count;
			row.shards += entry.node.powerShards() * entry.count;
		});

		// Geothermal generators and augmenters cost buildings like any other.
		// The augmenters' somersloops join the plan's somersloop total as
		// well as their build materials - the plan really does need that many.
		nodes.extraPower.forEach(entry => {
			this.addExtraBuilding(map, SpecialClasses.GeothermalGeneratorBuilding,
				entry.extraPower.geothermalCount * entry.count, 0);
			this.addExtraBuilding(map, SpecialClasses.AlienPowerAugmenterBuilding,
				entry.extraPower.augmenters.count * entry.count, entry.extraPower.sloopCost * entry.count);
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

	/**
	 * Power panel rows for the buildings that are settings rather than nodes:
	 * one for the geothermal generators, one for the augmenters. `generated`
	 * is what the plan's own generators make - the augmenters raise it.
	 */
	private extraPowerRows(plan: Plan, generated: number): {rows: PowerRow[]; production: PowerDraw}
	{
		const extra = this.extraPower.resolve(plan.settings);
		if (!extra.isActive) {
			return {rows: [], production: PowerDraw.ZERO};
		}

		const data = this.versionManager.activeVersionData();
		const rows: PowerRow[] = [];
		const geothermal = extra.geothermalPower;
		const augmenters = extra.augmenterBonus(generated);

		if (extra.geothermalCount > 0) {
			const building = data?.searchBuildingByClassName(SpecialClasses.GeothermalGeneratorBuilding);
			rows.push({
				key: SpecialClasses.GeothermalGeneratorBuilding,
				name: building?.name ?? 'Geothermal Generator',
				icon: building?.icon ?? null,
				kind: 'generator',
				machines: extra.geothermalCount,
				power: geothermal.negate(),
				entries: this.geothermalEntries(extra),
			});
		}

		if (extra.augmenters.count > 0) {
			const building = data?.searchBuildingByClassName(SpecialClasses.AlienPowerAugmenterBuilding);
			rows.push({
				key: SpecialClasses.AlienPowerAugmenterBuilding,
				name: building?.name ?? 'Alien Power Augmenter',
				icon: building?.icon ?? null,
				kind: 'generator',
				machines: extra.augmenters.count,
				power: augmenters.negate(),
				entries: this.augmenterEntries(extra, geothermal.add(PowerDraw.fixed(generated))),
			});
		}

		return {rows, production: geothermal.add(augmenters)};
	}

	/**
	 * One row per augmenter mode. Each augmenter brings its own fixed MW
	 * (raised by the shared percentage) plus its own share of that percentage
	 * on `base` - everything the plan generates before the augmenters.
	 */
	private augmenterEntries(extra: ExtraPower, base: PowerDraw): PowerEntryRow[]
	{
		const plain = ExtraPower.forAugmenters(1, 0);
		const boosted = ExtraPower.forAugmenters(1, 1);
		const modes = [
			{key: 'normal', label: 'Normal', count: extra.augmenters.count - extra.augmenters.boosted, one: plain},
			{key: 'boosted', label: 'Boosted', count: extra.augmenters.boosted, one: boosted},
		];
		return modes
			.filter(mode => mode.count > 0)
			.map(mode => {
				const share = mode.one.multiplier - 1;
				const power = PowerDraw.fixed(mode.count * mode.one.flatBonus * extra.multiplier)
					.add(base.scale(mode.count * share));
				return {
					key: mode.key,
					name: `${mode.label} (+${this.rateFormatter.percent(share)} each)`,
					machines: mode.count,
					detail: '',
					power: power.negate(),
				};
			});
	}

	/** One row per geyser purity the plan uses, each with what those generators make. */
	private geothermalEntries(extra: ExtraPower): PowerEntryRow[]
	{
		const purities: {key: keyof GeothermalGenerators; name: string}[] = [
			{key: 'impure', name: 'Impure geysers'},
			{key: 'normal', name: 'Normal geysers'},
			{key: 'pure', name: 'Pure geysers'},
		];
		return purities
			.filter(purity => extra.geysers[purity.key] > 0)
			.map(purity => {
				const count = extra.geysers[purity.key];
				const only = ExtraPower.forGeysers({...ExtraPower.NO_GEYSERS, [purity.key]: count});
				return {
					key: purity.key,
					name: purity.name,
					machines: count,
					detail: '',
					power: only.geothermalPower.negate(),
				};
			});
	}

	private addExtraBuilding(
		map: Map<string, {building: Building; machines: number; shards: number; sloops: number}>,
		className: string,
		count: number,
		sloops: number,
	): void
	{
		const building = this.versionManager.activeVersionData()?.searchBuildingByClassName(className);
		if (!building || count <= 0) {
			return;
		}
		const row = this.getOrCreate(map, className, () => ({building, machines: 0, shards: 0, sloops: 0}));
		row.machines += count;
		row.sloops += sloops;
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
	 * All machine, generator and mine nodes reachable from the given plan, nested
	 * subplans included. The ancestors set carries the plan ids on the current
	 * path, so a corrupted cyclic reference terminates instead of recursing
	 * forever - while the same subplan used twice as siblings still counts twice.
	 */
	private collectProductionNodes(planId: string, ancestors: ReadonlySet<string>): ProductionNodes
	{
		const result: ProductionNodes = {recipes: [], generators: [], mines: [], extraPower: []};
		if (ancestors.has(planId)) {
			return result;
		}
		const plan = this.planManager.findPlan(planId);
		const graph = this.reviveGraph(plan?.graph ?? null);
		if (!graph) {
			return result;
		}

		// The augmenters' percentage applies to what this plan's own
		// generators make - a subplan brings its own entry for its own.
		let generated = 0;
		const path = new Set([...ancestors, planId]);
		graph.nodes.forEach(node => {
			if (node instanceof RecipeNode) {
				result.recipes.push({node, count: 1});
			} else if (node instanceof GeneratorNode) {
				generated += node.powerProduction();
				result.generators.push({node, count: 1});
			} else if (node instanceof MineNode) {
				result.mines.push({node, count: 1});
			} else if (node instanceof SubplanNode) {
				// A subplan built several times brings everything inside it that many times.
				const builds = Math.max(1, node.buildCount);
				const nested = this.collectProductionNodes(node.subplanId, path);
				result.recipes.push(...this.multiplied(nested.recipes, builds));
				result.generators.push(...this.multiplied(nested.generators, builds));
				result.mines.push(...this.multiplied(nested.mines, builds));
				result.extraPower.push(...nested.extraPower.map(entry => ({...entry, count: entry.count * builds})));
			}
		});
		result.extraPower.unshift(...this.extraPowerEntries(plan, generated));
		return result;
	}

	/** The plan's own geothermal and augmenter setup, or nothing when it has none. */
	private extraPowerEntries(plan: Plan | null | undefined, generated: number): CountedExtraPower[]
	{
		const extraPower = this.extraPower.resolve(plan?.settings);
		return extraPower.isActive ? [{extraPower, generated, count: 1}] : [];
	}

	private multiplied<T extends Node>(nodes: CountedNode<T>[], factor: number): CountedNode<T>[]
	{
		return factor === 1 ? nodes : nodes.map(entry => ({node: entry.node, count: entry.count * factor}));
	}

	private countMachines(nodes: ProductionNodes): number
	{
		return nodes.recipes.reduce((sum, entry) => sum + entry.node.amount * entry.count, 0)
			+ nodes.generators.reduce((sum, entry) => sum + entry.node.wholeGenerators() * entry.count, 0)
			+ nodes.extraPower.reduce((sum, entry) =>
				sum + (entry.extraPower.geothermalCount + entry.extraPower.augmenters.count) * entry.count, 0);
	}

	/**
	 * Multiple nodes may reference the same subplan - one row each, scaled by
	 * how many times the subplan is built across all of them.
	 */
	private groupSubplans(nodes: SubplanNode[]): {subplanId: string; name: string; count: number}[]
	{
		const groups = new Map<string, {subplanId: string; name: string; count: number}>();
		nodes.forEach(node => {
			const group = this.getOrCreate(groups, node.subplanId,
				() => ({subplanId: node.subplanId, name: node.name, count: 0}));
			group.count += Math.max(1, node.buildCount);
		});
		return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
	}

	/** A subplan counted more than once says so in its row: "Blueprint A (built 3×)". */
	private subplanRowName(group: {name: string; count: number}): string
	{
		return group.count > 1 ? `${group.name} (built ${group.count}×)` : group.name;
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
			// Several nodes of one subplan share a row - the amounts already
			// carry their build counts, so the name stays the plain one.
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
