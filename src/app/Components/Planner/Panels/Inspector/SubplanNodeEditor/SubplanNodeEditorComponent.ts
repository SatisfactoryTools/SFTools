import {Component, ChangeDetectionStrategy, Input, OnChanges, OnDestroy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faArrowUpRightFromSquare, faDiagramProject, faLock} from '@fortawesome/free-solid-svg-icons';
import {Subject, Subscription} from 'rxjs';
import {debounceTime} from 'rxjs/operators';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {PlannerActionsService} from '@src/Components/Planner/PlannerActionsService';
import {SubplanIORateDraft} from '@src/Components/Planner/Panels/Inspector/SubplanNodeEditor/SubplanIORateDraft';
import {SubplanIOResolver} from '@src/Model/Planner/SubplanIOResolver';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanIconResolver} from '@src/Model/Planner/PlanIconResolver';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanNameResolver} from '@src/Model/Planner/PlanNameResolver';
import {SubplanNode} from '@src/Model/Planner/Solver/Response/SubplanNode';
import {RateFormatter} from '@src/Model/RateFormatter';

/** Quiet time after the last edit before the resize is applied to the subplan. */
const APPLY_DEBOUNCE_MS = 400;

/**
 * Inspector editor of a subplan node. What it edits is the subplan's size:
 * typing a new rate for any of its inputs or outputs resizes the whole
 * subplan by that ratio - its graph, its machines (rebuilt per its own
 * grouping and clock settings) and its production requests - exactly as
 * typing a rate rescales a recipe node. Everything else about a subplan is
 * edited by opening it.
 *
 * The build count is the other way to size a subplan: the subplan stays as
 * it is and is simply built that many times over, like a blueprint. The
 * rates typed here are always those of a single build; what all the builds
 * come to together is shown under them.
 */
@Component({
	selector: 'subplan-node-editor',
	templateUrl: './SubplanNodeEditorComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, FaIconComponent, AppTooltipDirective, GameIconComponent, InfoNoteComponent],
	styles: [`
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
		.io-total {
			font-size: 0.75rem;
			margin-top: 0.15rem;
		}
		.build-count {
			width: 6.5rem;
		}
	`],
})
export class SubplanNodeEditorComponent implements OnChanges, OnDestroy
{

	public readonly faArrowUpRightFromSquare = faArrowUpRightFromSquare;
	public readonly faDiagramProject = faDiagramProject;
	public readonly faLock = faLock;

	@Input({required: true}) public node!: SubplanNode;

	/** A read-only plan is inspected, never edited - only the fields lock, opening the subplan stays. */
	@Input() public readOnly = false;

	public inputRates: SubplanIORateDraft[] = [];
	public outputRates: SubplanIORateDraft[] = [];

	/** How many times the whole subplan is built by this node. */
	public buildCount = 1;

	/**
	 * The node instance the draft was built from. A still-pending resize is
	 * measured against the node the user actually typed into, even when the
	 * selection has already moved on (see ngOnChanges).
	 */
	private loadedNode: SubplanNode | null = null;

	/** The resize the typed rate asks for, applied once the typing stops. */
	private pendingFactor: number | null = null;

	/** The build count typed but not yet applied to the node. */
	private pendingBuildCount: number | null = null;

	private readonly applySubject = new Subject<void>();
	private readonly applySubscription: Subscription;

	public constructor(
		private readonly actions: PlannerActionsService,
		private readonly planManager: PlanManager,
		private readonly planNames: PlanNameResolver,
		private readonly planIcons: PlanIconResolver,
		private readonly subplanResolver: SubplanIOResolver,
		public readonly rateFormatter: RateFormatter,
	)
	{
		this.applySubscription = this.applySubject
			.pipe(debounceTime(APPLY_DEBOUNCE_MS))
			.subscribe(() => this.applyDraft());
	}

	public ngOnChanges(): void
	{
		if (this.loadedNode?.id === this.node.id) {
			this.loadedNode = this.node;
			// A resize coming back - show the rates it actually landed on,
			// unless the user has kept typing in the meantime.
			if (this.pendingFactor === null) {
				this.refreshRates();
			}
			if (this.pendingBuildCount === null) {
				this.buildCount = this.node.buildCount;
			}
			return;
		}
		this.flushPendingApply();
		this.loadedNode = this.node;
		this.buildCount = this.node.buildCount;
		this.refreshRates();
	}

	/** A rate typed just before deselecting the node must still reach the subplan. */
	public ngOnDestroy(): void
	{
		this.flushPendingApply();
		this.applySubscription.unsubscribe();
	}

	/** The subplan's current name (it may have been renamed since the node was saved). */
	public get displayName(): string
	{
		const plan = this.subplan;
		return plan ? this.planNames.displayName(plan) : this.node.name;
	}

	public get iconHash(): string | null
	{
		const plan = this.subplan;
		return plan ? this.planIcons.iconHash(plan) : null;
	}

	/** False for a node whose subplan is gone (a dangling reference) - nothing to open. */
	public get subplanExists(): boolean
	{
		return this.subplan !== null;
	}

	/**
	 * How many builds the totals are shown for: what is typed in the build
	 * count field, or the node's own count while that field is mid-edit.
	 */
	public get builds(): number
	{
		return typeof this.buildCount === 'number' && isFinite(this.buildCount) && this.buildCount >= 1
			? this.subplanResolver.normalizeBuildCount(this.buildCount)
			: this.node.buildCount;
	}

	/** Whether the node builds its subplan more than once - only then is a total worth showing. */
	public get buildsMany(): boolean
	{
		return this.builds > 1;
	}

	/** What one build's rate comes to across all the builds; empty while the field is mid-typing. */
	public totalText(draft: SubplanIORateDraft): string
	{
		if (typeof draft.rate !== 'number' || !isFinite(draft.rate)) {
			return '';
		}
		return this.rateFormatter.rate(draft.rate * this.builds, draft.item);
	}

	/** An empty subplan has no rates to type into - there is nothing to resize yet. */
	public get isEmpty(): boolean
	{
		return this.inputRates.length === 0 && this.outputRates.length === 0;
	}

	public openSubplan(): void
	{
		this.actions.requestSubplanOpen(this.node.subplanId);
	}

	/**
	 * A new build count leaves the subplan alone and simply builds it that
	 * many times - every rate, machine and cost of it counts that many times.
	 */
	public onBuildCountChange(): void
	{
		// Mid-typing values (empty, zero, negative) must not reach the node.
		if (typeof this.buildCount !== 'number' || !isFinite(this.buildCount) || this.buildCount < 1) {
			return;
		}
		this.pendingBuildCount = this.subplanResolver.normalizeBuildCount(this.buildCount);
		this.applySubject.next();
	}

	/** A typed input rate resizes the subplan by that ratio; every other rate follows. */
	public onInputRateChange(index: number): void
	{
		this.scheduleScale(this.perBuild(this.editedNode.inputs[index]?.maxAmount), this.inputRates[index]?.rate, {kind: 'input', index});
	}

	public onOutputRateChange(index: number): void
	{
		this.scheduleScale(this.perBuild(this.editedNode.outputs[index]?.maxAmount), this.outputRates[index]?.rate, {kind: 'output', index});
	}

	/** The node's rates cover all its builds; the fields show (and take) one build's. */
	private perBuild(amount: number | undefined): number | undefined
	{
		return amount === undefined ? undefined : amount / this.editedNode.buildCount;
	}

	private scheduleScale(current: number | undefined, rate: number | undefined, typed: {kind: 'input' | 'output'; index: number}): void
	{
		// Mid-typing values (empty, zero, negative) must not resize anything.
		if (!current || current <= 0 || typeof rate !== 'number' || !isFinite(rate) || rate <= 0) {
			return;
		}
		this.pendingFactor = rate / current;
		this.refreshRates(typed);
		this.applySubject.next();
	}

	private get subplan(): Plan | null
	{
		return this.planManager.findPlan(this.node.subplanId);
	}

	/** The draft the getters work on - the loaded node while it exists, the input before the first load. */
	private get editedNode(): SubplanNode
	{
		return this.loadedNode ?? this.node;
	}

	/**
	 * Rewrites the rate fields from the node's own rates (per build) and the
	 * resize the user has asked for, keeping the field being typed in
	 * untouched.
	 */
	private refreshRates(typed: {kind: 'input' | 'output'; index: number} | null = null): void
	{
		const factor = this.pendingFactor ?? 1;
		const node = this.editedNode;
		const rateOf = (amount: number): number => this.roundRate(amount * factor / node.buildCount);
		this.inputRates = node.inputs.map((io, index) =>
			typed?.kind === 'input' && typed.index === index
				? this.inputRates[index]
				: {item: io.item, rate: rateOf(io.maxAmount)});
		this.outputRates = node.outputs.map((io, index) =>
			typed?.kind === 'output' && typed.index === index
				? this.outputRates[index]
				: {item: io.item, rate: rateOf(io.maxAmount)});
	}

	/** An edit typed but not yet applied must still land - before the draft is replaced or the editor closes. */
	private flushPendingApply(): void
	{
		if (this.pendingFactor !== null || this.pendingBuildCount !== null) {
			this.applyDraft();
		}
	}

	private applyDraft(): void
	{
		const factor = this.pendingFactor;
		const buildCount = this.pendingBuildCount;
		const node = this.loadedNode;
		this.pendingFactor = null;
		this.pendingBuildCount = null;
		if (node === null) {
			return;
		}
		if (buildCount !== null && buildCount !== node.buildCount) {
			this.actions.requestSubplanBuildCount({nodeId: node.id, buildCount});
		}
		if (factor === null || !isFinite(factor) || factor <= 0 || Math.abs(factor - 1) <= 1e-9) {
			return;
		}
		this.actions.requestSubplanScale({nodeId: node.id, subplanId: node.subplanId, factor});
	}

	/** Re-derived values get readable rounding; typed ones stay verbatim. */
	private roundRate(rate: number): number
	{
		return Math.round(rate * 10000) / 10000;
	}

}
