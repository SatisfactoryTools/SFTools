import {Component, ChangeDetectionStrategy, Input, OnChanges} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faLock, faLockOpen, faPlus, faXmark} from '@fortawesome/free-solid-svg-icons';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {PlannerActionsService} from '@src/Components/Planner/PlannerActionsService';
import {GroupingMode} from '@src/Components/Planner/Panels/Inspector/RecipeNodeEditor/GroupingMode';
import {GroupingModeOption} from '@src/Components/Planner/Panels/Inspector/RecipeNodeEditor/GroupingModeOption';
import {IORateDraft} from '@src/Components/Planner/Panels/Inspector/RecipeNodeEditor/IORateDraft';
import {MachineGroupDraft} from '@src/Components/Planner/Panels/Inspector/RecipeNodeEditor/MachineGroupDraft';
import {Building} from '@src/Model/Data/Entities/Building';
import {Formulas} from '@src/Model/Planner/Formulas';
import {MachineGroupNormalizer} from '@src/Model/Planner/MachineGroupNormalizer';
import {MachineGroup} from '@src/Model/Planner/Solver/Response/MachineGroup';
import {RecipeNode} from '@src/Model/Planner/Solver/Response/RecipeNode';
import {RateFormatter} from '@src/Model/RateFormatter';

/**
 * The production target is edited through the input/output rates: changing
 * any rate rescales the recipe (with the output as the source of truth -
 * sloop or group changes keep the outputs and re-derive the inputs). Machine
 * groups only describe how the machines are built; too few machines for the
 * target is allowed but warned about, spare machines just lower efficiency.
 */
@Component({
	selector: 'recipe-node-editor',
	templateUrl: './RecipeNodeEditorComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, FaIconComponent, BsDropdownModule],
})
export class RecipeNodeEditorComponent implements OnChanges
{

	public readonly faLock = faLock;
	public readonly faLockOpen = faLockOpen;
	public readonly faPlus = faPlus;
	public readonly faXmark = faXmark;

	public readonly groupingOptions: GroupingModeOption[] = [
		{
			mode: 'underclock-last',
			label: 'Underclock last',
			description: 'Machines at 100%, the last one at the remaining clock speed.',
		},
		{
			mode: 'clock-equally',
			label: 'Clock equally',
			description: 'All machines share the same clock speed.',
		},
		{
			mode: 'no-clocking',
			label: 'No clocking',
			description: 'Whole machines at 100%, trading efficiency for simplicity.',
		},
	];

	@Input({required: true}) public node!: RecipeNode;

	public machineClassName = '';
	public groups: MachineGroupDraft[] = [];
	public inputRates: IORateDraft[] = [];
	public outputRates: IORateDraft[] = [];
	public groupingMode: GroupingMode = 'underclock-last';

	/** Boosted recipe cycles per minute delivered to the outputs - the draft's source of truth. */
	private outputCycles = 0;

	private loadedNodeId: string | null = null;

	public constructor(
		private readonly actions: PlannerActionsService,
		private readonly normalizer: MachineGroupNormalizer,
		public readonly rateFormatter: RateFormatter,
	)
	{
	}

	/**
	 * Rebuilds the draft only when a different node is selected; the same
	 * node arriving as a new instance (after "Update graph" replaces it)
	 * keeps the draft as-is.
	 */
	public ngOnChanges(): void
	{
		if (this.node.id === this.loadedNodeId) {
			return;
		}
		this.loadedNodeId = this.node.id;
		this.machineClassName = this.node.machine.className;
		this.groups = this.node.groups.map(group => ({...group}));
		this.outputCycles = this.node.target * this.referenceCycles(this.node.machine) * this.node.outputBoostRatio();
		this.refreshRates();
	}

	public get selectedMachine(): Building | null
	{
		const recipe = this.node.recipe;
		return recipe.producedIn.find(machine => machine.className === this.machineClassName)
			?? recipe.producedIn[0]
			?? null;
	}

	public get machineOptions(): Building[]
	{
		return this.node.recipe.producedIn;
	}

	public get isModified(): boolean
	{
		if (this.machineClassName !== this.node.machine.className) {
			return true;
		}
		if (JSON.stringify(this.groups) !== JSON.stringify(this.node.groups)) {
			return true;
		}
		return Math.abs(this.draftTarget - this.node.target) > 1e-9 * Math.max(1, this.node.target);
	}

	/** Fraction of time the drafted machines would run, capped at 100%. */
	public get efficiency(): number
	{
		const capacity = this.draftCapacity;
		return capacity > 0 ? Math.min(1, this.draftTarget / capacity) : 0;
	}

	/** The drafted machines cannot reach the target - warn, never rescale. */
	public get hasCapacityShortage(): boolean
	{
		return RecipeNode.isCapacityShort(this.draftTarget, this.draftCapacity);
	}

	public toggleLock(): void
	{
		this.actions.requestNodeLock({nodeIds: [this.node.id], locked: !this.node.locked});
	}

	/** Rescales the whole recipe so this input is met; outputs follow the boost ratio. */
	public onInputRateChange(index: number): void
	{
		const machine = this.selectedMachine;
		const ingredient = this.node.recipe.ingredients[index];
		const rate = this.inputRates[index]?.rate;
		if (!machine || !ingredient || !this.isEditableRate(rate)) {
			return;
		}
		this.outputCycles = (rate / ingredient.amount) * this.boostRatio(machine);
		this.refreshRates({kind: 'input', index});
	}

	/** Pins the outputs to this rate; inputs re-derive from the boost ratio. */
	public onOutputRateChange(index: number): void
	{
		const product = this.node.recipe.products[index];
		const rate = this.outputRates[index]?.rate;
		if (!product || !this.isEditableRate(rate)) {
			return;
		}
		this.outputCycles = rate / product.amount;
		this.refreshRates({kind: 'output', index});
	}

	/** Groups define the build only: outputs stay pinned, inputs re-derive from the new boost ratio. */
	public onGroupsChange(): void
	{
		this.refreshRates();
	}

	public onMachineChange(): void
	{
		this.clampSloops();
		this.refreshRates();
	}

	public setGroupingMode(mode: GroupingMode): void
	{
		this.groupingMode = mode;
	}

	public get groupingLabel(): string
	{
		return this.groupingOptions.find(option => option.mode === this.groupingMode)?.label ?? '';
	}

	/**
	 * Replaces the machine groups with an arrangement calculated from the
	 * target, per the selected grouping mode. Mixed per-group sloop counts
	 * cannot survive regrouping - a uniform sloop count is kept, anything
	 * mixed resets to none.
	 */
	public autoGroup(): void
	{
		const machine = this.selectedMachine;
		if (!machine || this.outputCycles <= 0) {
			return;
		}
		if (!confirm('Replace the current machine groups with the calculated ones?')) {
			return;
		}
		const sloops = this.uniformSloops(machine);
		const target = this.outputCycles / Formulas.sloopOutputMultiplier(machine, sloops) / this.referenceCycles(machine);
		this.groups = this.generateGroups(target, sloops).map(group => ({...group}));
		this.refreshRates();
	}

	public addGroup(): void
	{
		this.groups.push({machines: 1, clockSpeed: 100, sloops: 0});
		this.refreshRates();
	}

	public removeGroup(index: number): void
	{
		if (this.groups.length > 1) {
			this.groups.splice(index, 1);
			this.refreshRates();
		}
	}

	public apply(): void
	{
		const machine = this.selectedMachine;
		if (!machine || this.groups.length === 0 || this.outputCycles <= 0) {
			return;
		}

		const groups = this.normalizedGroups(machine);
		// Reflect the normalization (clamps, rounding) back into the form.
		this.groups = groups.map(group => ({...group}));

		// The outputs are the promise: derive the target through the
		// normalized groups' boost ratio so they hold exactly.
		const target = this.outputCycles / this.boostRatioOf(groups, machine) / this.referenceCycles(machine);
		const updated = new RecipeNode(this.node.id, target, groups, machine, this.node.recipe);
		updated.x = this.node.x;
		updated.y = this.node.y;
		// Editing a node makes it user-owned: the solver must build around it.
		updated.locked = true;
		this.refreshRates();
		this.actions.requestNodeUpdate(updated);
	}

	/** Machine-equivalents at 100% clock the draft target needs. */
	private get draftTarget(): number
	{
		const machine = this.selectedMachine;
		return machine ? this.outputCycles / this.boostRatio(machine) / this.referenceCycles(machine) : 0;
	}

	/** Machine-equivalents at 100% clock the drafted groups provide. */
	private get draftCapacity(): number
	{
		return Formulas.groupCapacity(this.sanitizedGroups());
	}

	/** Group drafts may hold empty/NaN fields mid-typing - the formulas get zeros instead. */
	private sanitizedGroups(): MachineGroup[]
	{
		return this.groups.map(group => ({
			machines: group.machines || 0,
			clockSpeed: group.clockSpeed || 0,
			sloops: group.sloops || 0,
		}));
	}

	/** Rewrites all rate fields from the source of truth, keeping the field being typed in untouched. */
	private refreshRates(skip: {kind: 'input' | 'output'; index: number} | null = null): void
	{
		const machine = this.selectedMachine;
		if (!machine) {
			this.inputRates = [];
			this.outputRates = [];
			return;
		}
		const targetCycles = this.outputCycles / this.boostRatio(machine);
		this.inputRates = this.node.recipe.ingredients.map((ingredient, index) =>
			skip?.kind === 'input' && skip.index === index
				? this.inputRates[index]
				: {item: ingredient.item, rate: this.roundRate(ingredient.amount * targetCycles)});
		this.outputRates = this.node.recipe.products.map((product, index) =>
			skip?.kind === 'output' && skip.index === index
				? this.outputRates[index]
				: {item: product.item, rate: this.roundRate(product.amount * this.outputCycles)});
	}

	private referenceCycles(machine: Building): number
	{
		return Formulas.referenceCycles(this.node.recipe, machine);
	}

	private boostRatio(machine: Building): number
	{
		return Formulas.outputBoostRatio(machine, this.sanitizedGroups());
	}

	private boostRatioOf(groups: MachineGroup[], machine: Building): number
	{
		return Formulas.outputBoostRatio(machine, groups);
	}

	private generateGroups(target: number, sloops: number): MachineGroup[]
	{
		const machines = Math.max(1, Math.ceil(target - 1e-9));
		switch (this.groupingMode) {
			case 'underclock-last':
				return this.normalizer.fromFractionalAmount(target, 100, sloops);
			case 'clock-equally':
				return [{machines, clockSpeed: this.normalizer.roundClock(target / machines * 100), sloops}];
			case 'no-clocking':
				return [{machines, clockSpeed: 100, sloops}];
		}
	}

	/** The sloop count shared by every group, or none when the groups disagree. */
	private uniformSloops(machine: Building): number
	{
		const first = this.groups[0]?.sloops || 0;
		const uniform = this.groups.every(group => (group.sloops || 0) === first);
		return this.normalizer.clampSloops(uniform ? first : 0, machine);
	}

	/** Mid-typing values (empty, zero, negative) must not collapse the whole draft. */
	private isEditableRate(rate: number | undefined): boolean
	{
		return typeof rate === 'number' && isFinite(rate) && rate > 0;
	}

	/** Rates re-derived from the source of truth get readable rounding; typed values stay verbatim. */
	private roundRate(rate: number): number
	{
		return Math.round(rate * 10000) / 10000;
	}

	private normalizedGroups(machine: Building): MachineGroup[]
	{
		return this.groups.map(group => ({
			machines: Math.max(1, Math.round(group.machines || 1)),
			clockSpeed: this.normalizer.roundClock(group.clockSpeed || 100),
			sloops: this.normalizer.clampSloops(group.sloops || 0, machine),
		}));
	}

	private clampSloops(): void
	{
		const machine = this.selectedMachine;
		if (machine) {
			this.groups.forEach(group => group.sloops = this.normalizer.clampSloops(group.sloops, machine));
		}
	}

}
