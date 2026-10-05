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

const APPLY_DEBOUNCE_MS = 400;

/** A typed rate resizes the whole subplan (graph, machines, requests) by that ratio; the build count instead builds it that many times over, and the rates shown are always one build's. */
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

	/** Only the fields lock - opening the subplan stays possible. */
	@Input() public readOnly = false;

	public inputRates: SubplanIORateDraft[] = [];
	public outputRates: SubplanIORateDraft[] = [];

	public buildCount = 1;

	/** A still-pending resize is measured against the node the user actually typed into, even when the selection has already moved on. */
	private loadedNode: SubplanNode | null = null;

	private pendingFactor: number | null = null;

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
			// A resize coming back - show the rates it actually landed on, unless the user has kept typing in the meantime.
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

	/** The subplan may have been renamed since the node was saved. */
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

	public get subplanExists(): boolean
	{
		return this.subplan !== null;
	}

	public get builds(): number
	{
		return typeof this.buildCount === 'number' && isFinite(this.buildCount) && this.buildCount >= 1
			? this.subplanResolver.normalizeBuildCount(this.buildCount)
			: this.node.buildCount;
	}

	public get buildsMany(): boolean
	{
		return this.builds > 1;
	}

	public totalText(draft: SubplanIORateDraft): string
	{
		if (typeof draft.rate !== 'number' || !isFinite(draft.rate)) {
			return '';
		}
		return this.rateFormatter.rate(draft.rate * this.builds, draft.item);
	}

	public get isEmpty(): boolean
	{
		return this.inputRates.length === 0 && this.outputRates.length === 0;
	}

	public openSubplan(): void
	{
		this.actions.requestSubplanOpen(this.node.subplanId);
	}

	public onBuildCountChange(): void
	{
		// Mid-typing values (empty, zero, negative) must not reach the node.
		if (typeof this.buildCount !== 'number' || !isFinite(this.buildCount) || this.buildCount < 1) {
			return;
		}
		this.pendingBuildCount = this.subplanResolver.normalizeBuildCount(this.buildCount);
		this.applySubject.next();
	}

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

	private get editedNode(): SubplanNode
	{
		return this.loadedNode ?? this.node;
	}

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
