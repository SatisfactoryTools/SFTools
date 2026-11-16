import {Component, ChangeDetectionStrategy, Input, OnChanges, OnDestroy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faLock, faLockOpen, faRotateLeft, faXmark} from '@fortawesome/free-solid-svg-icons';
import {Subject, Subscription} from 'rxjs';
import {debounceTime} from 'rxjs/operators';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {GoToNodeButtonComponent} from '@src/Components/Planner/Panels/GoToNode/GoToNodeButtonComponent';
import {ClockSpeedInputComponent} from '@src/Components/Planner/Panels/Calculator/Tabs/Overclocking/ClockSpeedInputComponent';
import {PlannerActionsService} from '@src/Components/Planner/PlannerActionsService';
import {GroupingModeOption} from '@src/Components/Planner/Panels/Inspector/RecipeNodeEditor/GroupingModeOption';
import {IORateDraft} from '@src/Components/Planner/Panels/Inspector/RecipeNodeEditor/IORateDraft';
import {MachineGroupDraft} from '@src/Components/Planner/Panels/Inspector/RecipeNodeEditor/MachineGroupDraft';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {RecipeChoice} from '@src/Components/Planner/Panels/Inspector/RecipeNodeEditor/RecipeChoice';
import {Building} from '@src/Model/Data/Entities/Building';
import {Recipe} from '@src/Model/Data/Entities/Recipe';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {EnabledRecipesResolver} from '@src/Model/Planner/EnabledRecipesResolver';
import {Formulas} from '@src/Model/Planner/Formulas';
import {GroupingMode} from '@src/Model/Planner/GroupingMode';
import {ClockSpeedResolver} from '@src/Model/Planner/ClockSpeedResolver';
import {MachineBuild} from '@src/Model/Planner/MachineBuild';
import {MachineBuilder} from '@src/Model/Planner/MachineBuilder';
import {MachineGroupNormalizer} from '@src/Model/Planner/MachineGroupNormalizer';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {SloopBudgetService} from '@src/Model/Planner/SloopBudgetService';
import {MachineGroup} from '@src/Model/Planner/Solver/Response/MachineGroup';
import {RecipeNode} from '@src/Model/Planner/Solver/Response/RecipeNode';
import {RateFormatter} from '@src/Model/RateFormatter';
import {HelpButtonComponent} from '@src/Components/Help/HelpButtonComponent';
import {InspectorMenuButtonComponent} from '@src/Components/Planner/Panels/Inspector/InspectorMenuButtonComponent';
import {ModLabelComponent} from '@src/Components/Mods/ModLabelComponent';

const APPLY_DEBOUNCE_MS = 400;

@Component({
	selector: 'recipe-node-editor',
	templateUrl: './RecipeNodeEditorComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [ModLabelComponent, InspectorMenuButtonComponent, FormsModule, BsDropdownModule, FaIconComponent, AppTooltipDirective, GameIconComponent, InfoNoteComponent, ClockSpeedInputComponent, HelpButtonComponent, GoToNodeButtonComponent],
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
		.info-row {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			column-gap: 0.5rem;
			row-gap: 0.25rem;
			min-width: 0;
		}
		.recipe-row {
			flex-wrap: nowrap;
		}
		.info-row > select {
			flex: 1 1 10rem;
			width: auto;
		}
		.io-list {
			display: flex;
			flex-direction: column;
			gap: 0.25rem;
		}
		.io-row {
			display: grid;
			grid-template-columns: auto minmax(0, 1fr) auto 8.5rem;
			align-items: center;
			column-gap: 0.5rem;
		}
		@container panel (max-width: 380px) {
			.io-row {
				grid-template-columns: auto minmax(0, 1fr) 7.5rem;
			}
			.io-row .io-per-craft {
				display: none;
			}
		}
		.recipe-io {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.25rem;
			margin-top: 0.15rem;
		}
		.recipe-io-entry {
			display: inline-flex;
			align-items: center;
			gap: 0.15rem;
		}
		.recipe-io-entry + .recipe-io-entry {
			margin-left: 0.25rem;
		}
		.recipe-menu {
			max-width: min(360px, 90vw);
			max-height: 60vh;
			overflow-y: auto;
		}
		.build-fields {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
		}
		.build-fields > .machines-field {
			flex: 0 1 6rem;
			min-width: 5rem;
		}
		.build-fields > .clock-field {
			flex: 1 1 240px;
			min-width: 0;
		}
		.section-title {
			font-size: 0.75rem;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.06em;
			color: var(--bs-secondary-color);
		}
		.groups-table .action-col {
			width: 1%;
			white-space: nowrap;
			text-align: right;
		}
		.auto-input {
			background: transparent;
			border-color: var(--bs-border-color-translucent);
			color: var(--bs-secondary-color);
			text-align: right;
			pointer-events: none;
		}
		.auto-input::-webkit-inner-spin-button {
			display: none;
		}
		.groups-table .action-col .btn {
			width: 2.75rem;
			height: 1.9rem;
			padding: 0;
			display: inline-flex;
			align-items: center;
			justify-content: center;
		}
		.auto-button {
			font-size: 0.75rem;
		}
		.auto-tag {
			font-size: 0.75em;
			font-weight: normal;
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
			description: 'All at the clock speed. The last one runs slower.',
			countDescription: 'Whole-number clocks. The last one runs slower.',
		},
		{
			mode: 'overclock-last',
			label: 'Overclock the last machine',
			description: 'All at the clock speed. The last one runs faster instead of adding a machine.',
			countDescription: 'Whole-number clocks. The last one runs faster.',
		},
		{
			mode: 'clock-equally',
			label: 'Same clock for all',
			description: 'All at the same clock, up to the clock speed.',
			countDescription: 'All at the same exact clock.',
		},
		{
			mode: 'no-clocking',
			label: 'Whole machines only',
			description: 'All at the clock speed. May make more than needed.',
			countDescription: 'All at the same whole-number clock. May make a bit more than needed.',
		},
	];

	@Input({required: true}) public node!: RecipeNode;

	public machineClassName = '';
	public recipeChoices: RecipeChoice[] = [];
	private draftMachine!: Building;
	public inputRates: IORateDraft[] = [];
	public outputRates: IORateDraft[] = [];

	public mode: GroupingMode = 'underclock-last';
	public restClockSpeed = 100;
	public restMachines: number | null = null;
	public restSloops = 0;
	public pinned: MachineGroupDraft[] = [];
	public custom = false;

	/** With Automatic off: the rows it had filled in, editable now but dropped when it is switched back on. */
	public manualRest: MachineGroupDraft[] = [];

	public previewGroups: MachineGroup[] = [];
	public restGroups: MachineGroup[] = [];

	/** Output in reference cycles: the draft's source of truth, so build changes keep the outputs and move the inputs. */
	private outputUnits = 0;

	/** Apply runs against this rather than the `node` input: a pending apply must flush against the node that was edited. */
	private loadedNode: RecipeNode | null = null;

	private readonly applySubject = new Subject<void>();
	private readonly applySubscription: Subscription;
	private applyPending = false;

	public constructor(
		private readonly actions: PlannerActionsService,
		private readonly builder: MachineBuilder,
		private readonly normalizer: MachineGroupNormalizer,
		private readonly clocks: ClockSpeedResolver,
		private readonly planManager: PlanManager,
		private readonly sloopBudget: SloopBudgetService,
		private readonly versionManager: VersionManager,
		private readonly enabledRecipes: EnabledRecipesResolver,
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
		if (this.loadedNode?.id === this.node.id && this.loadedNode.recipe.className === this.node.recipe.className) {
			this.loadedNode = this.node;
			return;
		}
		this.flushPendingApply();
		this.load(this.node);
	}

	private load(node: RecipeNode): void
	{
		this.loadedNode = node;
		this.recipeChoices = this.choicesFor(node);
		this.machineClassName = node.machine.className;
		this.draftMachine = node.machine;
		const build = node.build;
		this.mode = build.rest.mode;
		this.restClockSpeed = build.rest.clockSpeed;
		this.restMachines = build.rest.machines;
		this.restSloops = build.rest.sloops ?? 0;
		this.pinned = build.pinned.map(group => ({...group}));
		this.custom = build.custom;
		this.manualRest = (build.manualRest ?? []).map(group => ({...group}));
		this.outputUnits = this.builder.outputForTarget(build, node.target, node.machine);
		this.refresh();
	}

	/** Every other recipe making the node's main product; the plan's enabled ones first. */
	private choicesFor(node: RecipeNode): RecipeChoice[]
	{
		const data = this.versionManager.activeVersionData();
		const product = node.recipe.products[0]?.item;
		if (!data || !product) {
			return [];
		}
		const settings = this.planManager.activeSettings();
		const enabled = settings ? this.enabledRecipes.resolve(settings, data) : null;
		return data.getRecipesProducingItem(product.className)
			.filter(recipe => recipe.className !== node.recipe.className && recipe.producedIn.length > 0)
			.map(recipe => ({
				recipe,
				enabled: enabled === null || enabled.has(recipe.className),
			}))
			.sort((a, b) => Number(b.enabled) - Number(a.enabled) || a.recipe.name.localeCompare(b.recipe.name));
	}

	/**
	 * Replaces this node with one running another recipe at the same rate of the main product. The machine and build
	 * are kept when the new recipe runs in the same machine; connections are settled by the usual node update.
	 */
	public changeRecipe(recipe: Recipe): void
	{
		const node = this.editedNode;
		const product = node.recipe.products[0]?.item;
		const newProduct = recipe.products.find(entry => entry.item.className === product?.className);
		if (!product || !newProduct) {
			return;
		}
		this.flushPendingApply();
		const sameMachine = recipe.producedIn.find(machine => machine.className === node.machine.className);
		const machine = sameMachine ?? recipe.producedIn[0];
		const followsPlan = node.build.rest.clockSpeed === this.clocks.forRecipe(node.recipe, node.machine);
		const rest = {
			...node.build.rest,
			clockSpeed: followsPlan ? this.clocks.forRecipe(recipe, machine) : node.build.rest.clockSpeed,
		};
		const build: MachineBuild = sameMachine
			? {...node.build, rest}
			: {pinned: [], rest: {...rest, sloops: 0}, custom: false};
		const rate = node.outputs
			.filter(io => io.item.className === product.className)
			.reduce((sum, io) => sum + io.maxAmount, 0);
		const output = rate / newProduct.amount / Formulas.referenceCycles(recipe, machine);
		const target = this.builder.targetForOutput(build, output, machine);
		if (!(target > 0)) {
			return;
		}
		const updated = this.builder.node(node.id, target, build, machine, recipe);
		updated.x = node.x;
		updated.y = node.y;
		updated.locked = true;
		this.load(updated);
		this.actions.requestNodeUpdate(updated);
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
			? 'Locked. Click to unlock.'
			: 'Not locked. Click to lock.';
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

	public get sloopSlots(): number
	{
		return this.selectedMachine?.sloopSlots ?? 0;
	}

	public get modeOption(): GroupingModeOption | undefined
	{
		return this.groupingOptions.find(option => option.mode === this.mode);
	}

	public get modeDescription(): string
	{
		const option = this.modeOption;
		return (this.restMachines === null ? option?.description : option?.countDescription) ?? '';
	}

	public get restMachinesDisplay(): number
	{
		return this.restMachines ?? this.machineCount(this.restGroups);
	}

	public get restClockDisplay(): number
	{
		return this.restMachines === null ? this.restClockSpeed : (this.restGroups[0]?.clockSpeed ?? this.restClockSpeed);
	}

	public get restNeeded(): boolean
	{
		return this.restGroups.length > 0;
	}

	public get usesPlanClockSpeed(): boolean
	{
		return this.restClockSpeed === this.planClockSpeed;
	}

	public get totalMachines(): number
	{
		return this.machineCount(this.previewGroups);
	}

	public get totalShards(): number
	{
		return this.previewGroups.reduce((sum, group) => sum + group.machines * Formulas.powerShards(group.clockSpeed), 0);
	}

	public get totalSloops(): number
	{
		return this.previewGroups.reduce((sum, group) => sum + group.machines * group.sloops, 0);
	}

	/** Null when the plan has no sloop budget to compare against. */
	public get sloopsLeft(): number | null
	{
		const budget = Math.max(0, Math.round(this.planManager.activeSettings()?.maxSloops ?? 0));
		if (budget <= 0) {
			return null;
		}
		const graph = this.planManager.activePlan()?.graph;
		const others = graph ? {...graph, nodes: graph.nodes.filter(node => node.id !== this.editedNode.id)} : null;
		return budget - this.sloopBudget.usedByLockedNodes(others) - this.totalSloops;
	}

	public shardsOf(group: MachineGroup): number
	{
		return group.machines * Formulas.powerShards(group.clockSpeed);
	}

	public get efficiency(): number
	{
		const capacity = Formulas.groupCapacity(this.previewGroups);
		return capacity > 0 ? Math.min(1, this.draftTarget / capacity) : 0;
	}

	public get hasCapacityShortage(): boolean
	{
		return RecipeNode.isCapacityShort(this.draftTarget, Formulas.groupCapacity(this.previewGroups));
	}

	public get pinnedExceedTarget(): boolean
	{
		return this.builder.pinnedExceedTarget(this.draftBuild(), this.draftTarget);
	}

	/** How many machines the rest needs at the top clock, offered when a typed count falls short. */
	public get machinesNeeded(): number
	{
		const target = this.builder.restTarget(this.draftBuild(), this.draftTarget);
		return Math.max(1, Math.ceil(target * 100 / 250 - 1e-9));
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
		const target = (rate / ingredient.amount) / this.referenceCycles(machine);
		this.outputUnits = this.builder.outputForTarget(this.draftBuild(), target, machine);
		this.refresh({kind: 'input', index});
		this.scheduleApply();
	}

	public onOutputRateChange(index: number): void
	{
		const machine = this.selectedMachine;
		const product = this.editedNode.recipe.products[index];
		const rate = this.outputRates[index]?.rate;
		if (!machine || !product || !this.isEditableRate(rate)) {
			return;
		}
		this.outputUnits = (rate / product.amount) / this.referenceCycles(machine);
		this.refresh({kind: 'output', index});
		this.scheduleApply();
	}

	public onMachineChange(): void
	{
		const previous = this.draftMachine;
		const machine = this.selectedMachine;
		if (!machine) {
			return;
		}
		// The clock follows the plan's setting for the new machine unless it was changed by hand.
		if (this.restClockSpeed === this.clocks.forRecipe(this.editedNode.recipe, previous)) {
			this.restClockSpeed = this.planClockSpeed;
		}
		this.outputUnits = this.outputUnits * this.referenceCycles(previous) / this.referenceCycles(machine);
		[...this.pinned, ...this.manualRest].forEach(group => group.sloops = this.normalizer.clampSloops(group.sloops, machine));
		this.restSloops = this.normalizer.clampSloops(this.restSloops, machine);
		this.draftMachine = machine;
		this.refresh();
		this.scheduleApply();
	}

	public setMode(mode: GroupingMode): void
	{
		this.mode = mode;
		this.onBuildChange();
	}

	public onRestMachinesChange(value: number | null): void
	{
		if (typeof value !== 'number' || !isFinite(value) || value < 1) {
			return;
		}
		this.restMachines = Math.round(value);
		this.onBuildChange();
	}

	/** Every automatic machine gets the same sloops, so one cell sets them all and the count is worked out again. */
	public onRestSloopsChange(value: number | null): void
	{
		if (typeof value !== 'number' || !isFinite(value) || value < 0) {
			return;
		}
		this.restSloops = Math.round(value);
		this.onBuildChange();
	}

	public onRestClockChange(value: number): void
	{
		this.restClockSpeed = value;
		this.restMachines = null;
		this.onBuildChange();
	}

	public resetRestClock(): void
	{
		this.onRestClockChange(this.planClockSpeed);
	}

	public useMachinesNeeded(): void
	{
		this.restMachines = this.machinesNeeded;
		this.onBuildChange();
	}

	public addPinned(): void
	{
		this.pinned.push({machines: 1, clockSpeed: this.restClockSpeed, sloops: 0});
		this.onBuildChange();
	}

	public get canRemoveRows(): boolean
	{
		return !this.custom || this.pinned.length + this.manualRest.length > 1;
	}

	public removePinned(index: number): void
	{
		if (this.canRemoveRows) {
			this.pinned.splice(index, 1);
			this.onBuildChange();
		}
	}

	public removeManualRest(index: number): void
	{
		if (this.canRemoveRows) {
			this.manualRest.splice(index, 1);
			this.onBuildChange();
		}
	}

	public pinRest(index: number): void
	{
		const group = this.restGroups[index];
		if (group) {
			this.pinned.push({...group});
			this.onBuildChange();
		}
	}

	/** Switching off turns the automatic rows editable without changing the node; switching on drops them and works the rest out again. */
	public setAutomatic(automatic: boolean): void
	{
		if (automatic === !this.custom) {
			return;
		}
		this.manualRest = automatic ? [] : this.restGroups.map(group => ({...group}));
		this.custom = !automatic;
		this.onBuildChange();
	}

	public lowerPinnedClocks(): void
	{
		const fitted = this.builder.fitted(this.draftBuild(), this.draftTarget);
		this.pinned = fitted.pinned.map(group => ({...group}));
		this.onBuildChange();
	}

	/** Edits keep the outputs; the rest is rebuilt around the user's rows. */
	public onBuildChange(): void
	{
		this.refresh();
		this.scheduleApply();
	}

	public autofill(): void
	{
		const machine = this.selectedMachine;
		if (!machine) {
			return;
		}
		const groups = this.sanitized([...this.pinned, ...this.manualRest]);
		const deficit = this.outputUnits - Formulas.groupCapacity(groups) * Formulas.outputBoostRatio(machine, groups);
		if (deficit <= 0) {
			return;
		}
		this.manualRest = [
			...this.manualRest,
			...this.builder.restGroups({mode: this.mode, clockSpeed: this.restClockSpeed, machines: null}, deficit).map(group => ({...group})),
		];
		this.onBuildChange();
	}

	private get editedNode(): RecipeNode
	{
		return this.loadedNode ?? this.node;
	}

	private get planClockSpeed(): number
	{
		const machine = this.selectedMachine;
		return machine ? this.clocks.forRecipe(this.editedNode.recipe, machine) : 100;
	}

	private get draftTarget(): number
	{
		const machine = this.selectedMachine;
		return machine ? this.builder.targetForOutput(this.draftBuild(), this.outputUnits, machine) : 0;
	}

	/** Drafts may hold empty/NaN fields mid-typing - the build gets sane values instead. */
	private draftBuild(): MachineBuild
	{
		return {
			pinned: this.sanitized(this.pinned),
			rest: {
				mode: this.mode,
				clockSpeed: this.cleanClock(this.restClockSpeed, this.planClockSpeed),
				machines: this.restMachines,
				sloops: this.selectedMachine ? this.normalizer.clampSloops(this.restSloops || 0, this.selectedMachine) : 0,
			},
			custom: this.custom,
			...(this.custom ? {manualRest: this.sanitized(this.manualRest)} : {}),
		};
	}

	private sanitized(groups: MachineGroupDraft[]): MachineGroup[]
	{
		const machine = this.selectedMachine;
		return groups
			.filter(group => (group.machines || 0) > 0 && (group.clockSpeed || 0) > 0)
			.map(group => ({
				machines: Math.max(1, Math.round(group.machines)),
				clockSpeed: this.normalizer.roundClock(group.clockSpeed),
				sloops: machine ? this.normalizer.clampSloops(group.sloops || 0, machine) : 0,
			}));
	}

	private cleanClock(value: number, fallback: number): number
	{
		return isFinite(value) && value > 0 ? Formulas.clampClock(value) : fallback;
	}

	private scheduleApply(): void
	{
		this.applyPending = true;
		this.applySubject.next();
	}

	private flushPendingApply(): void
	{
		if (this.applyPending) {
			this.applyDraft();
		}
	}

	/** Every edit here is a decision the solver would not make, so it locks the node. */
	private applyDraft(): void
	{
		if (!this.applyPending) {
			return;
		}
		this.applyPending = false;

		const node = this.loadedNode;
		const machine = this.selectedMachine;
		const build = this.draftBuild();
		const target = this.draftTarget;
		if (!node || !machine || this.outputUnits <= 0 || target <= 0 || (build.custom && this.builder.customGroups(build).length === 0)) {
			return;
		}
		const updated = this.builder.node(node.id, target, build, machine, node.recipe);
		if (!this.differs(updated, node)) {
			return;
		}
		updated.x = node.x;
		updated.y = node.y;
		updated.locked = true;
		updated.done = node.done;
		this.actions.requestNodeUpdate(updated);
	}

	private differs(updated: RecipeNode, node: RecipeNode): boolean
	{
		return updated.machine.className !== node.machine.className
			|| JSON.stringify(updated.build) !== JSON.stringify(node.build)
			|| !this.builder.sameGroups(updated.groups, node.groups)
			|| Math.abs(updated.target - node.target) > 1e-9 * Math.max(1, node.target);
	}

	private refresh(skip: {kind: 'input' | 'output'; index: number} | null = null): void
	{
		const machine = this.selectedMachine;
		if (!machine) {
			this.inputRates = [];
			this.outputRates = [];
			this.previewGroups = [];
			this.restGroups = [];
			return;
		}
		const build = this.draftBuild();
		const target = this.draftTarget;
		this.previewGroups = this.builder.groups(build, target);
		this.restGroups = build.custom ? [] : this.builder.restGroups(build.rest, this.builder.restTarget(build, target));

		const targetCycles = target * this.referenceCycles(machine);
		const outputCycles = this.outputUnits * this.referenceCycles(machine);
		this.inputRates = this.editedNode.recipe.ingredients.map((ingredient, index) =>
			skip?.kind === 'input' && skip.index === index
				? this.inputRates[index]
				: {item: ingredient.item, perCraft: ingredient.amount, rate: this.roundRate(ingredient.amount * targetCycles)});
		this.outputRates = this.editedNode.recipe.products.map((product, index) =>
			skip?.kind === 'output' && skip.index === index
				? this.outputRates[index]
				: {item: product.item, perCraft: product.amount, rate: this.roundRate(product.amount * outputCycles)});
	}

	private referenceCycles(machine: Building): number
	{
		return Formulas.referenceCycles(this.editedNode.recipe, machine);
	}

	private machineCount(groups: MachineGroup[]): number
	{
		return groups.reduce((sum, group) => sum + group.machines, 0);
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

}
