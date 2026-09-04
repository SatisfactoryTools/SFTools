import {Injectable, Signal, signal} from '@angular/core';
import {Observable, Subject, Subscription} from 'rxjs';
import {FolderRecalculationProgress} from '@src/Components/Planner/FolderRecalculationProgress';
import {PlannerActionsService} from '@src/Components/Planner/PlannerActionsService';
import {PlannerGraphService} from '@src/Components/Planner/PlannerGraphService';
import {NotificationService} from '@src/Model/NotificationService';
import {Graph} from '@src/Model/Planner/Graph/Graph';
import {GraphComposer} from '@src/Model/Planner/Graph/GraphComposer';
import {GraphEdgeBuilder} from '@src/Model/Planner/Graph/GraphEdgeBuilder';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanNameResolver} from '@src/Model/Planner/PlanNameResolver';
import {PlanSerializer} from '@src/Model/Planner/PlanSerializer';
import {ResourcePoolService} from '@src/Model/Planner/Pool/ResourcePoolService';
import {ProductionSolverService} from '@src/Model/Planner/ProductionSolverService';
import {SolverResponse} from '@src/Model/Planner/Solver/Response/SolverResponse';

/**
 * Re-solves every automatic-mode plan of a folder one by one, in tree order,
 * without the canvas: each plan is solved, laid out and stored like a
 * regular calculation, so a plan solved earlier already counts against the
 * shared resource pool of the plans after it. Manual-mode plans and plans
 * with hand-modified graphs are skipped - they keep their "recalculate"
 * flag for the user to resolve. Component-scoped like the graph service it
 * borrows the ELK layout from.
 */
@Injectable()
export class FolderRecalculationService
{

	private readonly progressSignal = signal<FolderRecalculationProgress | null>(null);
	public readonly progress: Signal<FolderRecalculationProgress | null> = this.progressSignal.asReadonly();

	/** Plan ids whose stored graph was just replaced - the canvas re-renders the active one. */
	private readonly graphReplacedSubject = new Subject<string>();
	public readonly graphReplaced: Observable<string> = this.graphReplacedSubject.asObservable();

	private cancelled = false;
	private solveSubscription: Subscription | null = null;

	public constructor(
		private readonly planManager: PlanManager,
		private readonly planNames: PlanNameResolver,
		private readonly planSerializer: PlanSerializer,
		private readonly solver: ProductionSolverService,
		private readonly composer: GraphComposer,
		private readonly edgeBuilder: GraphEdgeBuilder,
		private readonly plannerGraph: PlannerGraphService,
		private readonly actions: PlannerActionsService,
		private readonly notifications: NotificationService,
		private readonly pool: ResourcePoolService,
	)
	{
	}

	/** Flagged by a settings push, or mining beyond its share of the pool. */
	public isOutdated(plan: Plan): boolean
	{
		return (plan.metadata.recalculationNeeded ?? false) || this.pool.overUsed(plan).length > 0;
	}

	/** Inner plans whose stored graph no longer matches their settings or pool share. */
	public outdatedPlans(folderId: string): Plan[]
	{
		return this.planManager.innerPlans(folderId).filter(plan => this.isOutdated(plan));
	}

	public isRunning(): boolean
	{
		return this.progressSignal() !== null;
	}

	/** Inner plans the batch would solve: automatic mode with an untouched graph. */
	public eligiblePlans(folderId: string): Plan[]
	{
		return this.planManager.innerPlans(folderId).filter(plan => this.isEligible(plan));
	}

	/** Inner plans flagged for recalculation that the batch will NOT touch (manual mode or hand-modified). */
	public skippedOutdatedPlans(folderId: string): Plan[]
	{
		return this.planManager.innerPlans(folderId)
			.filter(plan => this.isOutdated(plan) && !this.isEligible(plan));
	}

	public async run(folderId: string): Promise<void>
	{
		if (this.isRunning() || this.actions.isCalculating()) {
			return;
		}
		const plans = this.eligiblePlans(folderId);
		if (plans.length === 0) {
			return;
		}

		this.cancelled = false;
		this.actions.setCalculating(true);
		this.actions.setSolveError(null);
		const failures: string[] = [];

		try {
			for (let index = 0; index < plans.length; index++) {
				if (this.cancelled) {
					break;
				}
				// Re-read the plan: earlier iterations may have pushed settings or changed the pool.
				const plan = this.planManager.plans().find(p => p.id === plans[index].id);
				if (!plan) {
					continue;
				}
				this.progressSignal.set({folderId, done: index, total: plans.length, currentName: this.planNames.displayName(plan)});
				const failure = await this.recalculate(plan);
				if (failure !== null) {
					failures.push(`${this.planNames.displayName(plan)}: ${failure}`);
				}
			}
		} finally {
			this.progressSignal.set(null);
			this.actions.setCalculating(false);
		}

		if (this.cancelled) {
			this.notifications.show('Folder recalculation cancelled.');
		} else if (failures.length > 0) {
			this.notifications.show(`Recalculated the folder; ${failures.length} plan${failures.length === 1 ? '' : 's'} could not be solved: ${failures.join('; ')}`);
		} else {
			this.notifications.showSuccess(`Recalculated ${plans.length} plan${plans.length === 1 ? '' : 's'}.`);
		}
	}

	/** Stops after the current plan's solve is killed; already replaced graphs stay. */
	public cancel(): void
	{
		this.cancelled = true;
		this.solveSubscription?.unsubscribe();
		this.solveSubscription = null;
	}

	private isEligible(plan: Plan): boolean
	{
		return (plan.settings.calculationMode ?? 'automatic') === 'automatic' && !(plan.metadata.graphDirty ?? false);
	}

	/** Solves and stores one plan; returns a failure description or null. */
	private async recalculate(plan: Plan): Promise<string | null>
	{
		const validRequests = plan.requests.filter(request => request.itemClassName !== '');
		const existing = this.existingGraph(plan);
		const lockedNodes = existing?.nodes.filter(node => node.locked) ?? [];
		if (validRequests.length === 0 && lockedNodes.length === 0) {
			// Nothing to solve - the stored (empty) graph is as current as it gets.
			this.planManager.setRecalculationNeeded([plan.id], false);
			return null;
		}

		let result: SolverResponse;
		try {
			result = await this.solveOnce({...plan, requests: validRequests}, lockedNodes);
		} catch (err) {
			return this.cancelled ? 'cancelled' : String(err instanceof Error ? err.message : err);
		}
		if (this.cancelled) {
			return 'cancelled';
		}
		if (result.status !== 'Optimal') {
			return result.status;
		}

		const graph = await this.composeGraph(plan, result, existing);
		this.planManager.setGraph(plan.id, graph, false);
		this.planManager.setAchievedMaximums(plan.id, result.achievedMaximums);
		this.graphReplacedSubject.next(plan.id);
		return null;
	}

	/** Mirrors the canvas calculation's automatic-mode composition, minus the rendering. */
	private async composeGraph(plan: Plan, result: SolverResponse, existing: Graph | null): Promise<Graph>
	{
		if (existing && existing.nodes.some(node => node.locked)) {
			const rebuilt = this.composer.rebuild(existing, result.nodes);
			await this.plannerGraph.layout(rebuilt.nodes, rebuilt.edges, plan.settings.graph);
			return {nodes: rebuilt.nodes, edges: rebuilt.edges};
		}
		const edges = this.edgeBuilder.build(result.nodes);
		await this.plannerGraph.layout(result.nodes, edges, plan.settings.graph);
		return {nodes: result.nodes, edges};
	}

	/** One solve as a promise whose subscription stays cancellable (unsubscribing kills the solver worker). */
	private solveOnce(plan: Plan, lockedNodes: Graph['nodes']): Promise<SolverResponse>
	{
		return new Promise((resolve, reject) => {
			this.solveSubscription = this.solver.solve(plan, lockedNodes).subscribe({
				next: response => resolve(response),
				error: err => reject(err),
				complete: () => reject(new Error('cancelled')),
			});
		});
	}

	private existingGraph(plan: Plan): Graph | null
	{
		if (!plan.graph || plan.graph.nodes.length === 0) {
			return null;
		}
		try {
			return this.planSerializer.reviveGraph(plan.graph);
		} catch {
			return null;
		}
	}

}
