import {Injectable} from '@angular/core';
import {Observable, Subject} from 'rxjs';
import {FolderRecalculationService} from '@src/Components/Planner/FolderRecalculationService';
import {PlannerActionsService} from '@src/Components/Planner/PlannerActionsService';
import {Graph} from '@src/Model/Planner/Graph/Graph';
import {GraphReconciler} from '@src/Model/Planner/Graph/GraphReconciler';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanSerializer} from '@src/Model/Planner/PlanSerializer';
import {SubplanIOResolver} from '@src/Model/Planner/SubplanIOResolver';
import {SubplanNode} from '@src/Model/Planner/Solver/Response/SubplanNode';

/**
 * Carries subplan changes up the tree: a parent whose subplan now makes or needs something else gets its subplan nodes
 * refreshed and is marked for recalculation, and automatic plans are then recalculated deepest first. Component-scoped like
 * the folder recalculation it solves through.
 */
@Injectable()
export class SubplanSyncService
{

	/** Each pass solves at most this many plans, so a subplan cycle in broken data cannot spin forever. */
	private static readonly MAX_SOLVES = 30;

	private readonly graphChangedSubject = new Subject<string>();
	public readonly graphChanged: Observable<string> = this.graphChangedSubject.asObservable();

	private running = false;

	/** Plans whose recalculation failed, as they were then: retried only once they change. */
	private readonly failed = new Map<string, Plan>();

	public constructor(
		private readonly planManager: PlanManager,
		private readonly planSerializer: PlanSerializer,
		private readonly subplanIO: SubplanIOResolver,
		private readonly reconciler: GraphReconciler,
		private readonly folderRecalculation: FolderRecalculationService,
		private readonly actions: PlannerActionsService,
	)
	{
	}

	/** The open plan is calculated by the planner itself, so its history and canvas stay in step. */
	public async sync(activePlanId: string | null): Promise<void>
	{
		if (this.running || this.actions.isCalculating() || this.folderRecalculation.isRunning()) {
			return;
		}
		this.running = true;
		try {
			this.refreshStaleNodes();
			for (let solves = 0; solves < SubplanSyncService.MAX_SOLVES; solves++) {
				const plan = this.nextToRecalculate();
				if (plan === null) {
					break;
				}
				if (plan.id === activePlanId) {
					// Remembered as failed until it changes: a solve that works writes the plan anew, one that fails would be asked for again.
					this.failed.set(plan.id, plan);
					this.actions.requestCalculate();
					break;
				}
				const failure = await this.folderRecalculation.recalculateOne(plan);
				if (failure !== null) {
					this.failed.set(plan.id, this.planManager.findPlan(plan.id) ?? plan);
				}
				this.refreshStaleNodes();
			}
		} finally {
			this.running = false;
		}
	}

	/** Returns the same graph when every subplan node is current, and whether any of them now makes or needs something else. */
	public refreshed(graph: Graph): {graph: Graph; interfaceChanged: boolean}
	{
		let changed = false;
		let interfaceChanged = false;
		const changedIds: string[] = [];
		const nodes = graph.nodes.map(node => {
			if (!(node instanceof SubplanNode)) {
				return node;
			}
			const refreshed = this.subplanIO.refresh(node);
			if (refreshed !== node) {
				changed = true;
				if (!this.subplanIO.sameInterface(node, refreshed)) {
					interfaceChanged = true;
					changedIds.push(node.id);
				}
			}
			return refreshed;
		});
		if (!changed) {
			return {graph, interfaceChanged: false};
		}
		const updated = changedIds.reduce((current, id) => this.reconciler.reconcile(current, id), {nodes, edges: graph.edges});
		return {graph: updated, interfaceChanged};
	}

	private refreshStaleNodes(): void
	{
		this.planManager.plans()
			.filter(plan => plan.graph !== null && !this.planManager.isReadOnlyPlan(plan.id))
			.filter(plan => this.hasSubplanNodes(plan))
			.forEach(plan => {
				let graph: Graph;
				try {
					graph = this.planSerializer.reviveGraph(plan.graph!);
				} catch {
					return;
				}
				const result = this.refreshed(graph);
				if (result.graph === graph) {
					return;
				}
				this.planManager.setGraph(plan.id, result.graph);
				if (result.interfaceChanged) {
					this.planManager.setRecalculationNeeded([plan.id], true);
				}
				this.graphChangedSubject.next(plan.id);
			});
	}

	/** Deepest first, so a parent is solved once its subplans are final. */
	private nextToRecalculate(): Plan | null
	{
		const candidates = this.planManager.plans()
			.filter(plan => plan.metadata.recalculationNeeded ?? false)
			.filter(plan => !this.planManager.isReadOnlyPlan(plan.id))
			.filter(plan => (plan.settings.calculationMode ?? 'automatic') === 'automatic' && !(plan.metadata.graphDirty ?? false))
			.filter(plan => plan.parentPlanId !== null || this.hasSubplanNodes(plan))
			.filter(plan => this.failed.get(plan.id) !== plan);
		if (candidates.length === 0) {
			return null;
		}
		return candidates.reduce((deepest, plan) => this.depthOf(plan) > this.depthOf(deepest) ? plan : deepest);
	}

	private depthOf(plan: Plan): number
	{
		let depth = 0;
		let current: Plan | null = plan;
		const seen = new Set<string>();
		while (current?.parentPlanId && !seen.has(current.id)) {
			seen.add(current.id);
			depth++;
			current = this.planManager.findPlan(current.parentPlanId);
		}
		return depth;
	}

	private hasSubplanNodes(plan: Plan): boolean
	{
		return (plan.graph?.nodes ?? []).some(node => (node as unknown as {type?: string}).type === 'subplan');
	}

}
