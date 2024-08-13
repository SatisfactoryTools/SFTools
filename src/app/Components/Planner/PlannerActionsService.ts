import {Injectable, Signal, signal} from '@angular/core';
import {Observable, Subject} from 'rxjs';
import {GraphConnectToBlankRequest} from '@src/Components/Planner/GraphConnectToBlankRequest';
import {GraphEdgeAddRequest} from '@src/Components/Planner/GraphEdgeAddRequest';
import {GraphEdgeAmountRequest} from '@src/Components/Planner/GraphEdgeAmountRequest';
import {NodeLockRequest} from '@src/Components/Planner/NodeLockRequest';
import {GraphEdge} from '@src/Model/Planner/Graph/GraphEdge';
import {GraphPoint} from '@src/Model/Planner/Graph/GraphPoint';
import {Node} from '@src/Model/Planner/Solver/Response/Node';

/**
 * Mediates planner-wide actions between panels (which are instantiated via
 * ngComponentOutlet and cannot use output bindings) and the PlannerComponent,
 * which owns the graph canvas and runs the solver.
 */
@Injectable()
export class PlannerActionsService
{

	private readonly calculateSubject = new Subject<void>();
	public readonly calculateRequests: Observable<void> = this.calculateSubject.asObservable();

	private readonly cancelSubject = new Subject<void>();
	public readonly cancelRequests: Observable<void> = this.cancelSubject.asObservable();

	/** A replacement node (same id) to swap into the graph and reconcile. */
	private readonly nodeUpdateSubject = new Subject<Node>();
	public readonly nodeUpdateRequests: Observable<Node> = this.nodeUpdateSubject.asObservable();

	private readonly nodeLockSubject = new Subject<NodeLockRequest>();
	public readonly nodeLockRequests: Observable<NodeLockRequest> = this.nodeLockSubject.asObservable();

	/** Re-lay the active plan's graph through ELK without changing any amounts. */
	private readonly relayoutSubject = new Subject<void>();
	public readonly relayoutRequests: Observable<void> = this.relayoutSubject.asObservable();

	/** Graph-local position where the manual add-node dialog should open. */
	private readonly nodeAddSubject = new Subject<GraphPoint>();
	public readonly nodeAddRequests: Observable<GraphPoint> = this.nodeAddSubject.asObservable();

	/** A user-drawn edge between two existing nodes. */
	private readonly edgeAddSubject = new Subject<GraphEdgeAddRequest>();
	public readonly edgeAddRequests: Observable<GraphEdgeAddRequest> = this.edgeAddSubject.asObservable();

	/** A connect gesture dropped on blank canvas: create and wire the counterpart node there. */
	private readonly connectToBlankSubject = new Subject<GraphConnectToBlankRequest>();
	public readonly connectToBlankRequests: Observable<GraphConnectToBlankRequest> = this.connectToBlankSubject.asObservable();

	/** The edge to remove from the graph. */
	private readonly edgeDeleteSubject = new Subject<GraphEdge>();
	public readonly edgeDeleteRequests: Observable<GraphEdge> = this.edgeDeleteSubject.asObservable();

	/** A new flow amount for one edge (minimise/maximise). */
	private readonly edgeAmountSubject = new Subject<GraphEdgeAmountRequest>();
	public readonly edgeAmountRequests: Observable<GraphEdgeAmountRequest> = this.edgeAmountSubject.asObservable();

	/** Ids of the nodes to remove from the graph (together with their edges). */
	private readonly nodeDeleteSubject = new Subject<string[]>();
	public readonly nodeDeleteRequests: Observable<string[]> = this.nodeDeleteSubject.asObservable();

	/** Graph-local position where a new empty subplan node should be created. */
	private readonly subplanCreateSubject = new Subject<GraphPoint>();
	public readonly subplanCreateRequests: Observable<GraphPoint> = this.subplanCreateSubject.asObservable();

	/** Ids of the nodes to extract into a new subplan. */
	private readonly subplanConvertSubject = new Subject<string[]>();
	public readonly subplanConvertRequests: Observable<string[]> = this.subplanConvertSubject.asObservable();

	/** Id of the subplan (plan) to open as the active plan. */
	private readonly subplanOpenSubject = new Subject<string>();
	public readonly subplanOpenRequests: Observable<string> = this.subplanOpenSubject.asObservable();

	private readonly undoSubject = new Subject<void>();
	public readonly undoRequests: Observable<void> = this.undoSubject.asObservable();

	private readonly redoSubject = new Subject<void>();
	public readonly redoRequests: Observable<void> = this.redoSubject.asObservable();

	private readonly isCalculatingSignal = signal(false);
	public readonly isCalculating: Signal<boolean> = this.isCalculatingSignal.asReadonly();

	private readonly solveErrorSignal = signal<string | null>(null);
	public readonly solveError: Signal<string | null> = this.solveErrorSignal.asReadonly();

	// Longer explanation of a failed solve, shown in the calculator panel
	// (the status bar only has room for the short message).
	private readonly solveErrorDetailSignal = signal<string | null>(null);
	public readonly solveErrorDetail: Signal<string | null> = this.solveErrorDetailSignal.asReadonly();

	public requestCalculate(): void
	{
		this.calculateSubject.next();
	}

	/** Recalculating a manually modified graph rebuilds its unlocked parts - always ask first. */
	public confirmGraphOverwrite(): boolean
	{
		return confirm('Recalculate the plan? Locked nodes are kept; the rest of the graph will be rebuilt.');
	}

	public requestCancel(): void
	{
		this.cancelSubject.next();
	}

	public requestNodeUpdate(node: Node): void
	{
		this.nodeUpdateSubject.next(node);
	}

	public requestNodeLock(request: NodeLockRequest): void
	{
		this.nodeLockSubject.next(request);
	}

	public requestRelayout(): void
	{
		this.relayoutSubject.next();
	}

	public requestNodeAdd(position: GraphPoint): void
	{
		this.nodeAddSubject.next(position);
	}

	public requestEdgeAdd(request: GraphEdgeAddRequest): void
	{
		this.edgeAddSubject.next(request);
	}

	public requestConnectToBlank(request: GraphConnectToBlankRequest): void
	{
		this.connectToBlankSubject.next(request);
	}

	public requestEdgeDelete(edge: GraphEdge): void
	{
		this.edgeDeleteSubject.next(edge);
	}

	public requestEdgeAmount(request: GraphEdgeAmountRequest): void
	{
		this.edgeAmountSubject.next(request);
	}

	public requestNodeDelete(nodeIds: string[]): void
	{
		this.nodeDeleteSubject.next(nodeIds);
	}

	public requestSubplanCreate(position: GraphPoint): void
	{
		this.subplanCreateSubject.next(position);
	}

	public requestSubplanConvert(nodeIds: string[]): void
	{
		this.subplanConvertSubject.next(nodeIds);
	}

	public requestSubplanOpen(subplanId: string): void
	{
		this.subplanOpenSubject.next(subplanId);
	}

	public requestUndo(): void
	{
		this.undoSubject.next();
	}

	public requestRedo(): void
	{
		this.redoSubject.next();
	}

	public setCalculating(calculating: boolean): void
	{
		this.isCalculatingSignal.set(calculating);
	}

	public setSolveError(message: string | null, detail: string | null = null): void
	{
		this.solveErrorSignal.set(message);
		this.solveErrorDetailSignal.set(detail);
	}

}
