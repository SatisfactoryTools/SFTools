import {Component, ChangeDetectionStrategy, Input, OnChanges, OnDestroy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faCheck} from '@fortawesome/free-solid-svg-icons';
import {Subject, Subscription} from 'rxjs';
import {debounceTime} from 'rxjs/operators';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {GoToNodeButtonComponent} from '@src/Components/Planner/Panels/GoToNode/GoToNodeButtonComponent';
import {PlannerActionsService} from '@src/Components/Planner/PlannerActionsService';
import {PlannerGraphService} from '@src/Components/Planner/PlannerGraphService';
import {Item} from '@src/Model/Data/Entities/Item';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {GraphEdge} from '@src/Model/Planner/Graph/GraphEdge';
import {GraphEdgeKey} from '@src/Model/Planner/Graph/GraphEdgeKey';
import {RateFormatter} from '@src/Model/RateFormatter';
import {InspectorMenuButtonComponent} from '@src/Components/Planner/Panels/Inspector/InspectorMenuButtonComponent';

const APPLY_DEBOUNCE_MS = 400;

@Component({
	selector: 'edge-editor',
	templateUrl: './EdgeEditorComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [InspectorMenuButtonComponent, FormsModule, FaIconComponent, AppTooltipDirective, GameIconComponent, GoToNodeButtonComponent],
	styles: [`
		.endpoint-label {
			min-width: 2.5rem;
		}
	`],
})
export class EdgeEditorComponent implements OnChanges, OnDestroy
{

	public readonly faCheck = faCheck;

	@Input({required: true}) public edge!: GraphEdge;

	public amount = 0;

	/** A pending apply must flush against the connection the user edited, even after the selection moved on. */
	private loadedEdge: GraphEdge | null = null;

	private readonly applySubject = new Subject<void>();
	private readonly applySubscription: Subscription;
	private applyPending = false;

	public constructor(
		private readonly actions: PlannerActionsService,
		private readonly plannerGraph: PlannerGraphService,
		private readonly versionManager: VersionManager,
		private readonly rateFormatter: RateFormatter,
	)
	{
		this.applySubscription = this.applySubject
			.pipe(debounceTime(APPLY_DEBOUNCE_MS))
			.subscribe(() => this.applyDraft());
	}

	public ngOnChanges(): void
	{
		// Every render rebuilds the edges, so the same connection comes back as a new object.
		if (this.loadedEdge !== null && GraphEdgeKey.same(this.loadedEdge, this.edge)) {
			this.loadedEdge = this.edge;
			if (!this.applyPending) {
				this.amount = this.edge.amount;
			}
			return;
		}
		this.flushPendingApply();
		this.loadedEdge = this.edge;
		this.amount = this.edge.amount;
	}

	public ngOnDestroy(): void
	{
		this.flushPendingApply();
		this.applySubscription.unsubscribe();
	}

	public get item(): Item | null
	{
		return this.versionManager.activeVersionData()?.searchItemByClassName(this.edge.itemClassName) ?? null;
	}

	public get itemName(): string
	{
		return this.item?.name ?? this.edge.itemClassName;
	}

	public get unit(): string | null
	{
		const item = this.item;
		return item ? this.rateFormatter.unit(item) : null;
	}

	public get sourceName(): string
	{
		return this.plannerGraph.nodeOf(this.edge.sourceId)?.getDisplayName() ?? '';
	}

	public get targetName(): string
	{
		return this.plannerGraph.nodeOf(this.edge.targetId)?.getDisplayName() ?? '';
	}

	public get doneTooltip(): string
	{
		return this.edge.done
			? 'Done. Click to mark as not done.'
			: 'Not done. Click to mark as done.';
	}

	public toggleDone(): void
	{
		this.actions.requestEdgeDone({edges: [this.edge], done: !this.edge.done});
	}

	public onAmountChange(): void
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

	private applyDraft(): void
	{
		if (!this.applyPending) {
			return;
		}
		this.applyPending = false;

		const edge = this.loadedEdge;
		const amount = this.amount || 0;
		if (!edge || amount <= 0 || Math.abs(amount - edge.amount) <= 1e-9) {
			return;
		}
		this.actions.requestEdgeAmount({edge, amount});
	}

}
