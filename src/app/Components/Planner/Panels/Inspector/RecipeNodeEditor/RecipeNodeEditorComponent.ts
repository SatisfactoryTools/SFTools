import {Component, ChangeDetectionStrategy, Input, OnChanges, OnDestroy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faLock, faLockOpen, faPlus, faXmark} from '@fortawesome/free-solid-svg-icons';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {Subject, Subscription} from 'rxjs';
import {debounceTime} from 'rxjs/operators';
import {PlannerActionsService} from '@src/Components/Planner/PlannerActionsService';
import {GroupingModeOption} from '@src/Components/Planner/Panels/Inspector/RecipeNodeEditor/GroupingModeOption';
import {IORateDraft} from '@src/Components/Planner/Panels/Inspector/RecipeNodeEditor/IORateDraft';
import {MachineGroupDraft} from '@src/Components/Planner/Panels/Inspector/RecipeNodeEditor/MachineGroupDraft';
import {Building} from '@src/Model/Data/Entities/Building';
import {Formulas} from '@src/Model/Planner/Formulas';
import {GroupingMode} from '@src/Model/Planner/GroupingMode';
import {MachineGroupNormalizer} from '@src/Model/Planner/MachineGroupNormalizer';
import {MachineGroup} from '@src/Model/Planner/Solver/Response/MachineGroup';
import {RecipeNode} from '@src/Model/Planner/Solver/Response/RecipeNode';
import {RateFormatter} from '@src/Model/RateFormatter';

/** Quiet time after the last edit before the draft is applied to the graph. */
const APPLY_DEBOUNCE_MS = 400;

/**
 * The production target is edited through the input/output rates: changing
 * any rate rescales the recipe (with the output as the source of truth -
 * sloop or group changes keep the outputs and re-derive the inputs). Machine
 * groups only describe how the machines are built; too few machines for the
 * target is allowed but warned about (with an Autofill shortcut), spare
 * machines just lower efficiency.
 *
 * Every change is applied to the graph automatically after a short quiet
 * period - there is no explicit "update" button. Manual edits mark the node
 * user-owned (locked); Calculate and Autofill only rearrange machines and
 * leave the ownership as it is.
 */
@Component({
	selector: 'recipe-node-editor',
	templateUrl: './RecipeNodeEditorComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, FaIconComponent, BsDropdownModule],
})
export class RecipeNodeEditorComponent implements OnChanges, OnDestroy
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

	/**
	 * The node instance the draft was built from. The draft getters and the
	 * apply run against this, not the `node` input: when the selection moves
	 * to another node, a still-pending apply must flush against the node the
	 * user actually edited.
	 */
	private loadedNode: RecipeNode | null = null;

	private readonly applySubject = new Subject<void>();
	private readonly applySubscription: Subscription;
	private applyPending = false;
	/** Whether the pending apply contains a manual edit, which marks the node user-owned. */
	private applyLocks = false;

	public constructor(
		private readonly actions: PlannerActionsService,
		private readonly normalizer: MachineGroupNormalizer,
		public readonly rateFormatter: RateFormatter,
	)
	{
		this.applySubscription = this.applySubject
			.pipe(debounceTime(APPLY_DEBOUNCE_MS))
			.subscribe(() => this.applyDraft());
	}

	/**
	 * Rebuilds the draft only when a different node is selected; the same
	 * node arriving as a new instance (an applied update or a lock toggle
	 * coming back) keeps the draft, only re-tracking the instance so the
	 * next apply starts from its current lock state.
	 */
	public ngOnChanges(): void
	{
		if (this.loadedNode?.id === this.node.id) {
			this.loadedNode = this.node;
			return;
		}
		this.flushPendingApply();
		this.loadedNode = this.node;
		this.machineClassName = this.node.machine.className;
		this.groups = this.node.groups.map(group => ({...group}));
		this.groupingMode = this.node.groupingMode;
		this.outputCycles = this.node.target * this.referenceCycles(this.node.machine) * this.node.outputBoostRatio();
		this.refreshRates();
	}

	/** An edit made just before deselecting the node must still reach the graph. */
	public ngOnDestroy(): void
	{
		this.flushPendingApply();
		this.applySubscription.unsubscribe();
	}

	public get selectedMachine(): Building | null
	{
		const recipe = this.editedNode.recipe;
		return recipe.producedIn.find(machine => machine.className === this.machineClassName)
			?? recipe.producedIn[0]
			?? null;
	}

	public get machineOptions(): Building[]
	{
		return this.editedNode.recipe.producedIn;
	}

	public get isModified(): boolean
	{
		const node = this.editedNode;
		if (this.machineClassName !== node.machine.className) {
			return true;
		}
		if (this.groupingMode !== node.groupingMode) {
			return true;
		}
		if (JSON.stringify(this.groups) !== JSON.stringify(node.groups)) {
			return true;
		}
		return Math.abs(this.draftTarget - node.target) > 1e-9 * Math.max(1, node.target);
	}

	/** Fraction of time the drafted machines would run, capped at 100%. */
	public get efficiency(): number
	{
		const capacity = this.draftCapacity;
		return capacity > 0 ? Math.min(1, this.draftTarget / capacity) : 0;
	}

	/** The drafted machines cannot reach the target - warn and offer Autofill, never rescale. */
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
		const ingredient = this.editedNode.recipe.ingredients[index];
		const rate = this.inputRates[index]?.rate;
		if (!machine || !ingredient || !this.isEditableRate(rate)) {
			return;
		}
		this.outputCycles = (rate / ingredient.amount) * this.boostRatio(machine);
		this.refreshRates({kind: 'input', index});
		this.scheduleApply(true);
	}

	/** Pins the outputs to this rate; inputs re-derive from the boost ratio. */
	public onOutputRateChange(index: number): void
	{
		const product = this.editedNode.recipe.products[index];
		const rate = this.outputRates[index]?.rate;
		if (!product || !this.isEditableRate(rate)) {
			return;
		}
		this.outputCycles = rate / product.amount;
		this.refreshRates({kind: 'output', index});
		this.scheduleApply(true);
	}

	/** Groups define the build only: outputs stay pinned, inputs re-derive from the new boost ratio. */
	public onGroupsChange(): void
	{
		this.refreshRates();
		this.scheduleApply(true);
	}

	public onMachineChange(): void
	{
		this.clampSloops();
		this.refreshRates();
		this.scheduleApply(true);
	}

	public setGroupingMode(mode: GroupingMode): void
	{
		if (this.groupingMode !== mode) {
			this.groupingMode = mode;
			// The mode is part of the node - persist it, but a mode choice
			// alone is not a manual edit and must not lock the node.
			this.scheduleApply(false);
		}
	}

	public get groupingLabel(): string
	{
		return this.groupingOptions.find(option => option.mode === this.groupingMode)?.label ?? '';
	}

	/**
	 * Replaces the machine groups with an arrangement calculated from the
	 * target, per the selected grouping mode. Groups are recalculated per
	 * sloop count: each "machines + sloops" bucket keeps its capacity share,
	 * so the somersloop boost - and the input/output ratio - is preserved.
	 */
	public calculate(): void
	{
		const machine = this.selectedMachine;
		if (!machine || this.outputCycles <= 0) {
			return;
		}
		if (!confirm('Replace the current machine groups with the calculated ones?')) {
			return;
		}
		this.groups = this.normalizer
			.recalculated(this.sanitizedGroups(), this.draftTarget, this.groupingMode)
			.map(group => ({...group}));
		this.refreshRates();
		this.scheduleApply(false);
	}

	/**
	 * Appends machine groups covering the demand the current machines fall
	 * short of, arranged per the grouping mode with the last group's sloop
	 * count - the outputs stay exactly as configured.
	 */
	public autofill(): void
	{
		const machine = this.selectedMachine;
		const amount = this.autofillAmount();
		if (!machine || amount <= 0) {
			return;
		}
		this.groups = [
			...this.groups,
			...this.normalizer.generate(amount, 100, this.fillSloops(machine), this.groupingMode).map(group => ({...group})),
		];
		this.refreshRates();
		this.scheduleApply(false);
	}

	public addGroup(): void
	{
		this.groups.push({machines: 1, clockSpeed: 100, sloops: 0});
		this.refreshRates();
		this.scheduleApply(true);
	}

	public removeGroup(index: number): void
	{
		if (this.groups.length > 1) {
			this.groups.splice(index, 1);
			this.refreshRates();
			this.scheduleApply(true);
		}
	}

	/** The draft the getters work on - the loaded node while it exists, the input before the first load. */
	private get editedNode(): RecipeNode
	{
		return this.loadedNode ?? this.node;
	}

	private scheduleApply(locks: boolean): void
	{
		this.applyPending = true;
		this.applyLocks = this.applyLocks || locks;
		this.applySubject.next();
	}

	/** Applies a not-yet-debounced edit immediately - before the draft is replaced or the editor closes. */
	private flushPendingApply(): void
	{
		if (this.applyPending) {
			this.applyDraft();
		}
	}

	private applyDraft(): void
	{
		if (!this.applyPending) {
			return;
		}
		this.applyPending = false;
		const locks = this.applyLocks;
		this.applyLocks = false;

		const node = this.loadedNode;
		const machine = this.selectedMachine;
		if (!node || !machine || this.groups.length === 0 || this.outputCycles <= 0 || !this.isModified) {
			return;
		}

		const groups = this.normalizedGroups(machine);
		// The outputs are the promise: derive the target through the
		// normalized groups' boost ratio so they hold exactly.
		const target = this.outputCycles / this.boostRatioOf(groups, machine) / this.referenceCycles(machine);
		const updated = new RecipeNode(node.id, target, groups, machine, node.recipe);
		updated.x = node.x;
		updated.y = node.y;
		// A manual edit makes the node user-owned: the solver must build
		// around it. Calculate/Autofill keep the ownership as it is.
		updated.locked = node.locked || locks;
		updated.groupingMode = this.groupingMode;
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

	/**
	 * Machines (at 100% clock, with the fill sloop count) that Autofill would
	 * append. Derived through boosted cycles, so the appended groups close the
	 * shortage exactly even when the existing groups mix sloop counts.
	 */
	public autofillAmount(): number
	{
		const machine = this.selectedMachine;
		if (!machine || this.outputCycles <= 0) {
			return 0;
		}
		const groups = this.sanitizedGroups();
		const boostedDeficit = this.outputCycles / this.referenceCycles(machine)
			- Formulas.groupCapacity(groups) * Formulas.outputBoostRatio(machine, groups);
		return boostedDeficit / Formulas.sloopOutputMultiplier(machine, this.fillSloops(machine));
	}

	/** Autofill continues the build described above it: the last group's sloop count. */
	private fillSloops(machine: Building): number
	{
		return this.normalizer.clampSloops(this.groups[this.groups.length - 1]?.sloops || 0, machine);
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
		this.inputRates = this.editedNode.recipe.ingredients.map((ingredient, index) =>
			skip?.kind === 'input' && skip.index === index
				? this.inputRates[index]
				: {item: ingredient.item, rate: this.roundRate(ingredient.amount * targetCycles)});
		this.outputRates = this.editedNode.recipe.products.map((product, index) =>
			skip?.kind === 'output' && skip.index === index
				? this.outputRates[index]
				: {item: product.item, rate: this.roundRate(product.amount * this.outputCycles)});
	}

	private referenceCycles(machine: Building): number
	{
		return Formulas.referenceCycles(this.editedNode.recipe, machine);
	}

	private boostRatio(machine: Building): number
	{
		return Formulas.outputBoostRatio(machine, this.sanitizedGroups());
	}

	private boostRatioOf(groups: MachineGroup[], machine: Building): number
	{
		return Formulas.outputBoostRatio(machine, groups);
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
