import {Component, EventEmitter, Input, OnInit, Output, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {
	faBolt,
	faFlagCheckered,
	faIndustry,
	faMountain,
	faRecycle,
	faRightToBracket,
	faTrashCan,
} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {ItemPickerComponent} from '@src/Components/Common/ItemPickerComponent';
import {ItemPickerOption} from '@src/Components/Common/ItemPickerOption';
import {AddNodeFilter} from '@src/Components/Planner/AddNode/AddNodeFilter';
import {AddNodeType} from '@src/Components/Planner/AddNode/AddNodeType';
import {AddNodeTypeOption} from '@src/Components/Planner/AddNode/AddNodeTypeOption';
import {Data} from '@src/Model/Data/Data';
import {Building} from '@src/Model/Data/Entities/Building';
import {Item} from '@src/Model/Data/Entities/Item';
import {Fuel} from '@src/Model/Data/Entities/Parts/Fuel';
import {Recipe} from '@src/Model/Data/Entities/Recipe';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {Formulas} from '@src/Model/Planner/Formulas';
import {MachineGroupNormalizer} from '@src/Model/Planner/MachineGroupNormalizer';
import {MakeableItemsResolver} from '@src/Model/Planner/MakeableItemsResolver';
import {ByproductNode} from '@src/Model/Planner/Solver/Response/ByproductNode';
import {GeneratorNode} from '@src/Model/Planner/Solver/Response/GeneratorNode';
import {InputNode} from '@src/Model/Planner/Solver/Response/InputNode';
import {MineNode} from '@src/Model/Planner/Solver/Response/MineNode';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {ProductNode} from '@src/Model/Planner/Solver/Response/ProductNode';
import {RecipeNode} from '@src/Model/Planner/Solver/Response/RecipeNode';
import {SinkNode} from '@src/Model/Planner/Solver/Response/SinkNode';

/**
 * Modal for manually adding a graph node. The node type is chosen through the
 * toggles at the top (recipe by default); the set-once identity (recipe +
 * machine, item, or generator + fuel) is picked below, with the rate/count
 * defaulting to one - those numbers are tuned afterwards in the inspector.
 * Emits the built node on `add` and `close` on dismissal (backdrop, ✕, Escape).
 *
 * With a `filter` set (the dialog completes a connect-to-blank gesture), only
 * node types that can consume/produce the filter item are offered, the item
 * choice is fixed to it, and `suggestedAmount` prefills the rate.
 */
@Component({
	selector: 'add-node-dialog',
	templateUrl: './AddNodeDialogComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, FaIconComponent, GameIconComponent, ItemPickerComponent],
	styles: [`
		.add-node-backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); z-index: 1060; display: flex; align-items: center; justify-content: center; }
		.add-node-dialog { width: min(480px, 92vw); max-height: 80vh; display: flex; flex-direction: column; }
	`],
})
export class AddNodeDialogComponent implements OnInit
{

	@Input() public filter: AddNodeFilter | null = null;
	@Input() public suggestedAmount: number | null = null;

	@Output() public readonly add = new EventEmitter<Node>();
	@Output() public readonly close = new EventEmitter<void>();

	private readonly allTypes: AddNodeTypeOption[] = [
		{type: 'recipe', label: 'Recipe', icon: faIndustry},
		{type: 'input', label: 'Input', icon: faRightToBracket},
		{type: 'product', label: 'Product', icon: faFlagCheckered},
		{type: 'mine', label: 'Mine', icon: faMountain},
		{type: 'byproduct', label: 'Byproduct', icon: faRecycle},
		{type: 'generator', label: 'Generator', icon: faBolt},
		{type: 'sink', label: 'Sink', icon: faTrashCan},
	];

	public nodeType: AddNodeType = 'recipe';

	public recipeClassName = '';
	public itemClassName = '';
	public generatorClassName = '';
	public fuelItemClassName = '';
	public amount = 1;

	public constructor(
		private readonly versionManager: VersionManager,
		private readonly planManager: PlanManager,
		private readonly normalizer: MachineGroupNormalizer,
		private readonly makeableItems: MakeableItemsResolver,
	)
	{
	}

	/**
	 * With a filter, start on the most likely type: a mine when producing a
	 * raw resource, otherwise the first type that can take the item.
	 */
	public ngOnInit(): void
	{
		if (!this.filter) {
			return;
		}
		const types = this.types;
		const preferMine = this.filter.role === 'producer' && types.some(option => option.type === 'mine');
		this.setType(preferMine ? 'mine' : (types[0]?.type ?? 'recipe'));
	}

	/** Node types on offer - all of them, or only those matching the connect filter. */
	public get types(): AddNodeTypeOption[]
	{
		const filter = this.filter;
		const data = this.data;
		if (!filter || !data) {
			return this.allTypes;
		}
		const allowed = new Set<AddNodeType>();
		if (this.recipeOptions.length > 0) {
			allowed.add('recipe');
		}
		if (this.generatorOptions.length > 0) {
			allowed.add('generator');
		}
		if (filter.role === 'consumer') {
			allowed.add('product');
			allowed.add('byproduct');
			if ((this.filterItem?.sinkPoints ?? 0) > 0) {
				allowed.add('sink');
			}
		} else {
			allowed.add('input');
			if (data.resources.includes(filter.itemClassName)) {
				allowed.add('mine');
			}
		}
		return this.allTypes.filter(option => allowed.has(option.type));
	}

	/** The item the connect filter fixes; null without a filter. */
	public get filterItem(): Item | null
	{
		if (!this.filter) {
			return null;
		}
		return this.data?.searchItemByClassName(this.filter.itemClassName) ?? null;
	}

	/** Switching type clears the previous selection so no stale value leaks across kinds. */
	public setType(type: AddNodeType): void
	{
		this.nodeType = type;
		this.recipeClassName = '';
		this.itemClassName = '';
		this.generatorClassName = '';
		this.fuelItemClassName = '';
		this.amount = 1;
		this.applyFilterDefaults();
		this.applySingleOptionDefaults();
	}

	/** A choice with exactly one candidate is no choice - pre-select it. */
	private applySingleOptionDefaults(): void
	{
		if (this.nodeType === 'recipe') {
			const options = this.recipeOptions;
			if (options.length === 1) {
				this.recipeClassName = options[0].value;
			}
		} else if (this.nodeType === 'generator') {
			const options = this.generatorOptions;
			if (options.length === 1) {
				this.onGeneratorChange(options[0].value);
			}
		}
	}

	/** With a connect filter, the item is fixed and the rate starts at the gesture's free flow. */
	private applyFilterDefaults(): void
	{
		const filter = this.filter;
		if (!filter || this.nodeType === 'recipe' || this.nodeType === 'generator') {
			return;
		}
		this.itemClassName = filter.itemClassName;
		if (this.suggestedAmount !== null && this.suggestedAmount > 0) {
			this.amount = this.suggestedAmount;
		}
	}

	public get amountLabel(): string
	{
		if (this.nodeType === 'generator') {
			return 'Machines';
		}
		return 'Rate (/min)';
	}

	public get recipeOptions(): ItemPickerOption[]
	{
		const data = this.data;
		if (!data) {
			return [];
		}
		const filter = this.filter;
		let recipes = data.getRecipesForMachines();
		if (filter) {
			recipes = filter.role === 'consumer'
				? recipes.filter(recipe => recipe.ingredients.some(ingredient => ingredient.item.className === filter.itemClassName))
				: recipes.filter(recipe => recipe.products.some(product => product.item.className === filter.itemClassName));
		}
		return recipes
			.map(recipe => ({value: recipe.className, label: recipe.name, iconHash: recipe.products[0]?.item.icon ?? null}))
			.sort((a, b) => a.label.localeCompare(b.label));
	}

	/**
	 * Raw resources for a mine, sinkable items for a sink, every item
	 * otherwise - subject to the unmakeable-items display setting (raw
	 * resources always count as makeable, so mines are unaffected).
	 */
	public get itemOptions(): ItemPickerOption[]
	{
		const data = this.data;
		if (!data) {
			return [];
		}
		let items = data.items;
		if (this.nodeType === 'mine') {
			items = data.resources.map(className => data.getItemByClassName(className));
		} else if (this.nodeType === 'sink') {
			items = data.items.filter(item => item.sinkPoints > 0);
		}
		return this.makeableItems.applyToActivePlan(items
			.map(item => ({value: item.className, label: item.name, iconHash: item.icon}))
			.sort((a, b) => a.label.localeCompare(b.label)));
	}

	public get generatorOptions(): ItemPickerOption[]
	{
		const data = this.data;
		if (!data) {
			return [];
		}
		let generators = data.getPowerGenerators();
		if (this.filter) {
			generators = generators.filter(generator => this.matchingFuels(generator).length > 0);
		}
		return generators
			.map(generator => ({value: generator.className, label: generator.name, iconHash: generator.icon}))
			.sort((a, b) => a.label.localeCompare(b.label));
	}

	public get fuelOptions(): ItemPickerOption[]
	{
		const generator = this.data?.searchBuildingByClassName(this.generatorClassName);
		const fuels = generator ? this.matchingFuels(generator) : [];
		return fuels.map(fuel => ({value: fuel.item.className, label: fuel.item.name, iconHash: fuel.item.icon}));
	}

	/** A generator's fuel entries that touch the filter item; all of them without a filter. */
	private matchingFuels(generator: Building): Fuel[]
	{
		const filter = this.filter;
		if (!filter) {
			return generator.fuel;
		}
		return filter.role === 'consumer'
			? generator.fuel.filter(fuel =>
				fuel.item.className === filter.itemClassName || fuel.supplementalItem?.className === filter.itemClassName)
			: generator.fuel.filter(fuel => fuel.byproduct?.className === filter.itemClassName);
	}

	/** Selecting a generator defaults the fuel to its first accepted (and filter-matching) fuel. */
	public onGeneratorChange(className: string): void
	{
		this.generatorClassName = className;
		this.fuelItemClassName = this.fuelOptions[0]?.value ?? '';
		this.applyGeneratorSuggestion();
	}

	public onFuelChange(className: string): void
	{
		this.fuelItemClassName = className;
		this.applyGeneratorSuggestion();
	}

	/**
	 * With a connect filter, prefills the machine count so the generators
	 * exchange exactly the suggested rate of the filter item - whichever way
	 * the chosen fuel touches it (burning it, using it as the supplemental
	 * fluid, or emitting it as the burn byproduct).
	 */
	private applyGeneratorSuggestion(): void
	{
		const filter = this.filter;
		const rate = this.suggestedAmount;
		if (!filter || rate === null || rate <= 0) {
			return;
		}
		const generator = this.data?.searchBuildingByClassName(this.generatorClassName);
		const fuel = generator?.fuel.find(candidate => candidate.item.className === this.fuelItemClassName);
		if (!generator || !fuel) {
			return;
		}

		let perMachine = 0;
		if (filter.role === 'consumer') {
			if (fuel.item.className === filter.itemClassName) {
				perMachine = Formulas.generatorBurnRate(generator, fuel);
			} else if (fuel.supplementalItem?.className === filter.itemClassName) {
				perMachine = Formulas.generatorSupplementalRate(generator);
			}
		} else if (fuel.byproduct?.className === filter.itemClassName) {
			perMachine = Formulas.generatorBurnRate(generator, fuel) * fuel.byproductAmount;
		}
		if (perMachine > 0) {
			// Rounded off float noise; generator counts may be fractional.
			this.amount = Math.round(rate / perMachine * 1e6) / 1e6;
		}
	}

	/** Machines (at 100% clock) needed to exchange the suggested rate of the filter item; 1 without a filter. */
	private recipeTargetFor(recipe: Recipe, machine: Building): number
	{
		const filter = this.filter;
		const rate = this.suggestedAmount;
		if (!filter || rate === null || rate <= 0) {
			return 1;
		}
		const ios = filter.role === 'consumer' ? recipe.ingredients : recipe.products;
		const io = ios.find(entry => entry.item.className === filter.itemClassName);
		const perMachine = (io?.amount ?? 0) * Formulas.referenceCycles(recipe, machine);
		return perMachine > 0 ? rate / perMachine : 1;
	}

	public get canAdd(): boolean
	{
		switch (this.nodeType) {
			case 'recipe':
				return this.recipeClassName !== '';
			case 'generator':
				return this.generatorClassName !== '' && this.fuelItemClassName !== '' && this.amount > 0;
			default:
				return this.itemClassName !== '' && this.amount > 0;
		}
	}

	public submit(): void
	{
		const data = this.data;
		if (!data || !this.canAdd) {
			return;
		}

		const id = crypto.randomUUID();
		let node: Node;

		switch (this.nodeType) {
			case 'recipe': {
				// Each recipe is produced in exactly one machine - no choice to
				// make. With a connect filter, the node is sized to exchange the
				// suggested rate of the filter item; one machine otherwise.
				const recipe = data.getRecipeByClassName(this.recipeClassName);
				const machine = recipe.producedIn[0];
				const target = this.recipeTargetFor(recipe, machine);
				const groupingMode = this.planManager.activeSettings()?.defaultGroupingMode ?? 'underclock-last';
				const recipeNode = new RecipeNode(
					id,
					target,
					this.normalizer.generate(target, 100, 0, groupingMode),
					machine,
					recipe,
				);
				recipeNode.groupingMode = groupingMode;
				node = recipeNode;
				break;
			}
			case 'input':
				node = new InputNode(id, this.amount, data.getItemByClassName(this.itemClassName));
				break;
			case 'product':
				node = new ProductNode(id, this.amount, data.getItemByClassName(this.itemClassName));
				break;
			case 'mine':
				node = new MineNode(id, this.amount, data.getItemByClassName(this.itemClassName));
				break;
			case 'byproduct':
				node = new ByproductNode(id, this.amount, data.getItemByClassName(this.itemClassName));
				break;
			case 'generator': {
				const generator = data.getBuildingByClassName(this.generatorClassName);
				const fuel = generator.fuel.find(f => f.item.className === this.fuelItemClassName);
				if (!fuel) {
					return;
				}
				node = new GeneratorNode(id, this.amount, generator, fuel);
				break;
			}
			case 'sink':
				node = new SinkNode(id, this.amount, data.getItemByClassName(this.itemClassName));
				break;
		}

		// Manually added nodes are user-owned: the solver builds around them and
		// never replaces them, just like edited recipe nodes and subplans.
		node.locked = true;
		this.add.emit(node);
	}

	private get data(): Data | null
	{
		return this.versionManager.activeVersionData();
	}

}
