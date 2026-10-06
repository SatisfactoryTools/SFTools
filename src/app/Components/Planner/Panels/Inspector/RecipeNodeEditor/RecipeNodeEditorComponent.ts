import {Component, ChangeDetectionStrategy, Input, OnChanges, OnDestroy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faLock, faLockOpen, faRotateLeft, faXmark} from '@fortawesome/free-solid-svg-icons';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {Subject, Subscription} from 'rxjs';
import {debounceTime} from 'rxjs/operators';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {ClockSpeedInputComponent} from '@src/Components/Planner/Panels/Calculator/Tabs/Overclocking/ClockSpeedInputComponent';
import {PlannerActionsService} from '@src/Components/Planner/PlannerActionsService';
import {GroupingModeOption} from '@src/Components/Planner/Panels/Inspector/RecipeNodeEditor/GroupingModeOption';
import {IORateDraft} from '@src/Components/Planner/Panels/Inspector/RecipeNodeEditor/IORateDraft';
import {MachineGroupDraft} from '@src/Components/Planner/Panels/Inspector/RecipeNodeEditor/MachineGroupDraft';
import {Building} from '@src/Model/Data/Entities/Building';
import {Formulas} from '@src/Model/Planner/Formulas';
import {GroupingMode} from '@src/Model/Planner/GroupingMode';
import {ClockSpeedResolver} from '@src/Model/Planner/ClockSpeedResolver';
import {MachineGroupNormalizer} from '@src/Model/Planner/MachineGroupNormalizer';
import {MachineGroup} from '@src/Model/Planner/Solver/Response/MachineGroup';
import {RecipeNode} from '@src/Model/Planner/Solver/Response/RecipeNode';
import {RateFormatter} from '@src/Model/RateFormatter';
import {HelpButtonComponent} from '@src/Components/Help/HelpButtonComponent';

const APPLY_DEBOUNCE_MS = 400;

@Component({
	selector: 'recipe-node-editor',
	templateUrl: './RecipeNodeEditorComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, FaIconComponent, BsDropdownModule, AppTooltipDirective, GameIconComponent, InfoNoteComponent, ClockSpeedInputComponent, HelpButtonComponent],
	styles: [`
		@container panel (max-width: 300px) {
			.groups-table td.stack-grow {
				display: flex;
				flex: 1 1 4rem;
				flex-direction: column;
				align-items: stretch;
			}
			.groups-table td.stack-grow[data-label]::before {
				margin: 0 0 0.1rem;
				white-space: nowrap;
			}
			.groups-table tbody td:last-child { margin-left: auto; }
		}
		.io-tiles {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
		}
		.io-tile {
			flex: 1 1 130px;
			max-width: 220px;
			min-width: 0;
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 0.15rem;
			padding: 0.4rem 0.4rem 0.5rem;
			background: rgba(255, 255, 255, 0.04);
			text-align: center;
		}
		.io-tile .io-name {
			max-width: 100%;
		}
		.io-tile .input-group {
			margin-top: 0.2rem;
		}
	`],
})
export class RecipeNodeEditorComponent implements OnChanges, OnDestroy
{

	public readonly faLock = faLock;
	public readonly faLockOpen = faLockOpen;
	public readonly faRotateLeft = faRotateLeft;
	public readonly faXmark = faXmark;

	public readonly groupingOptions: GroupingModeOption[] = [
		{
			mode: 'underclock-last',
			label: 'Underclock the last machine',
			description: 'All machines run at the default clock speed, only the last one runs slower.',
		},
		{
			mode: 'clock-equally',
			label: 'Same clock for all',
			description: 'All machines run at the same clock speed, at most the default one.',
		},
		{
			mode: 'no-clocking',
			label: 'Whole machines only',
			description: 'Only whole machines at the default clock speed. Simpler to build, but may make more than needed.',
		},
	];

	@Input({required: true}) public node!: RecipeNode;

	public machineClassName = '';
	public groups: MachineGroupDraft[] = [];
	public inputRates: IORateDraft[] = [];
	public outputRates: IORateDraft[] = [];
	public groupingMode: GroupingMode = 'underclock-last';

	/** Hand-built graphs never go through the request panel, so the clock is seeded from the plan but editable here. */
	public defaultClockSpeed = 100;

	private defaultClockEdited = false;

	private outputCycles = 0;

	/** Apply runs against this rather than the `node` input: a pending apply must flush against the node that was edited. */
	private loadedNode: RecipeNode | null = null;

	private readonly applySubject = new Subject<void>();
	private readonly applySubscription: Subscription;
	private applyPending = false;
	private applyLocks = false;

	public constructor(
		private readonly actions: PlannerActionsService,
		private readonly normalizer: MachineGroupNormalizer,
		private readonly clocks: ClockSpeedResolver,
		public readonly rateFormatter: RateFormatter,
	)
	{
		this.applySubscription = this.applySubject
			.pipe(debounceTime(APPLY_DEBOUNCE_MS))
			.subscribe(() => this.applyDraft());
	}

	/** The same node arriving as a new instance keeps the draft; it is only re-tracked so the next apply sees its current lock state. */
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
		this.defaultClockEdited = false;
		this.defaultClockSpeed = this.planClockSpeed;
		this.outputCycles = this.node.target * this.referenceCycles(this.node.machine) * this.node.outputBoostRatio();
		this.refreshRates();
	}

	public ngOnDestroy(): void
	{
		this.flushPendingApply();
		this.applySubscription.unsubscribe();
	}

	public get recipeIcon(): string | null
	{
		return this.editedNode.recipe.products[0]?.item.icon ?? null;
	}

	public get lockTooltip(): string
	{
		return this.node.locked
			? 'Locked - the calculation keeps this node as it is. Click to unlock.'
			: 'Unlocked - the calculation may change or replace this node. Click to lock it.';
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

	private get planClockSpeed(): number
	{
		const machine = this.selectedMachine;
		return machine ? this.clocks.forRecipe(this.editedNode.recipe, machine) : 100;
	}

	private get buildClockSpeed(): number
	{
		const value = this.defaultClockSpeed;
		return isFinite(value) && value > 0 ? Formulas.clampClock(value) : this.planClockSpeed;
	}

	public get usesPlanClockSpeed(): boolean
	{
		return this.buildClockSpeed === this.planClockSpeed;
	}

	public onDefaultClockChange(value: number): void
	{
		this.defaultClockSpeed = value;
		this.defaultClockEdited = true;
	}

	public resetDefaultClock(): void
	{
		this.defaultClockSpeed = this.planClockSpeed;
		this.defaultClockEdited = false;
	}

	public get efficiency(): number
	{
		const capacity = this.draftCapacity;
		return capacity > 0 ? Math.min(1, this.draftTarget / capacity) : 0;
	}

	public get hasCapacityShortage(): boolean
	{
		return RecipeNode.isCapacityShort(this.draftTarget, this.draftCapacity);
	}

	public toggleLock(): void
	{
		this.actions.requestNodeLock({nodeIds: [this.node.id], locked: !this.node.locked});
	}

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

	public onGroupsChange(): void
	{
		this.refreshRates();
		this.scheduleApply(true);
	}

	public onMachineChange(): void
	{
		// Another machine may have its own row in the Overclocking tab.
		if (!this.defaultClockEdited) {
			this.defaultClockSpeed = this.planClockSpeed;
		}
		this.clampSloops();
		this.refreshRates();
		this.scheduleApply(true);
	}

	public setGroupingMode(mode: GroupingMode): void
	{
		if (this.groupingMode !== mode) {
			this.groupingMode = mode;
			// A mode choice alone is not a manual edit and must not lock the node.
			this.scheduleApply(false);
		}
	}

	public get groupingLabel(): string
	{
		return this.groupingOptions.find(option => option.mode === this.groupingMode)?.label ?? '';
	}

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
			.recalculated(this.sanitizedGroups(), this.draftTarget, this.groupingMode, this.buildClockSpeed)
			.map(group => ({...group}));
		this.refreshRates();
		this.scheduleApply(false);
	}

	public autofill(): void
	{
		const machine = this.selectedMachine;
		const amount = this.autofillAmount();
		if (!machine || amount <= 0) {
			return;
		}
		this.groups = [
			...this.groups,
			...this.normalizer
				.generateForTarget(amount, this.buildClockSpeed, this.fillSloops(machine), this.groupingMode)
				.map(group => ({...group})),
		];
		this.refreshRates();
		this.scheduleApply(false);
	}

	public addGroup(): void
	{
		this.groups.push({machines: 1, clockSpeed: this.buildClockSpeed, sloops: 0});
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
		const target = this.outputCycles / this.boostRatioOf(groups, machine) / this.referenceCycles(machine);
		const updated = new RecipeNode(node.id, target, groups, machine, node.recipe);
		updated.x = node.x;
		updated.y = node.y;
		// Manual edits make the node user-owned; Calculate/Autofill keep the ownership as it is.
		updated.locked = node.locked || locks;
		updated.done = node.done;
		updated.groupingMode = this.groupingMode;
		this.actions.requestNodeUpdate(updated);
	}

	private get draftTarget(): number
	{
		const machine = this.selectedMachine;
		return machine ? this.outputCycles / this.boostRatio(machine) / this.referenceCycles(machine) : 0;
	}

	private get draftCapacity(): number
	{
		return Formulas.groupCapacity(this.sanitizedGroups());
	}

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
				: {item: ingredient.item, perCraft: ingredient.amount, rate: this.roundRate(ingredient.amount * targetCycles)});
		this.outputRates = this.editedNode.recipe.products.map((product, index) =>
			skip?.kind === 'output' && skip.index === index
				? this.outputRates[index]
				: {item: product.item, perCraft: product.amount, rate: this.roundRate(product.amount * this.outputCycles)});
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
