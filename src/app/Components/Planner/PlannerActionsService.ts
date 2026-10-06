import {Injectable, Signal, signal} from '@angular/core';
import {Observable, Subject} from 'rxjs';
import {GraphConnectToBlankRequest} from '@src/Components/Planner/GraphConnectToBlankRequest';
import {GraphEdgeAddRequest} from '@src/Components/Planner/GraphEdgeAddRequest';
import {GraphEdgeAmountRequest} from '@src/Components/Planner/GraphEdgeAmountRequest';
import {FuelDisableRequest} from '@src/Components/Planner/FuelDisableRequest';
import {NodeDoneRequest} from '@src/Components/Planner/NodeDoneRequest';
import {NodeLockRequest} from '@src/Components/Planner/NodeLockRequest';
import {NodeSplitRequest} from '@src/Components/Planner/NodeSplitRequest';
import {SubplanBuildCountRequest} from '@src/Components/Planner/SubplanBuildCountRequest';
import {SubplanScaleRequest} from '@src/Components/Planner/SubplanScaleRequest';
import {GraphEdge} from '@src/Model/Planner/Graph/GraphEdge';
import {GraphPoint} from '@src/Model/Planner/Graph/GraphPoint';
import {Node} from '@src/Model/Planner/Solver/Response/Node';

/** Panels are created via ngComponentOutlet and cannot use output bindings, so their actions reach PlannerComponent through here. */
@Injectable()
export class PlannerActionsService
{

	private readonly calculateSubject = new Subject<void>();
	public readonly calculateRequests: Observable<void> = this.calculateSubject.asObservable();

	private readonly cancelSubject = new Subject<void>();
	public readonly cancelRequests: Observable<void> = this.cancelSubject.asObservable();

	private readonly nodeUpdateSubject = new Subject<Node>();
	public readonly nodeUpdateRequests: Observable<Node> = this.nodeUpdateSubject.asObservable();

	private readonly nodeLockSubject = new Subject<NodeLockRequest>();
	public readonly nodeLockRequests: Observable<NodeLockRequest> = this.nodeLockSubject.asObservable();

	private readonly nodeDoneSubject = new Subject<NodeDoneRequest>();
	public readonly nodeDoneRequests: Observable<NodeDoneRequest> = this.nodeDoneSubject.asObservable();

	private readonly relayoutSubject = new Subject<void>();
	public readonly relayoutRequests: Observable<void> = this.relayoutSubject.asObservable();

	private readonly nodeAddSubject = new Subject<GraphPoint>();
	public readonly nodeAddRequests: Observable<GraphPoint> = this.nodeAddSubject.asObservable();

	private readonly edgeAddSubject = new Subject<GraphEdgeAddRequest>();
	public readonly edgeAddRequests: Observable<GraphEdgeAddRequest> = this.edgeAddSubject.asObservable();

	private readonly connectToBlankSubject = new Subject<GraphConnectToBlankRequest>();
	public readonly connectToBlankRequests: Observable<GraphConnectToBlankRequest> = this.connectToBlankSubject.asObservable();

	private readonly edgeDeleteSubject = new Subject<GraphEdge>();
	public readonly edgeDeleteRequests: Observable<GraphEdge> = this.edgeDeleteSubject.asObservable();

	private readonly edgeAmountSubject = new Subject<GraphEdgeAmountRequest>();
	public readonly edgeAmountRequests: Observable<GraphEdgeAmountRequest> = this.edgeAmountSubject.asObservable();

	private readonly nodeSplitSubject = new Subject<NodeSplitRequest>();
	public readonly nodeSplitRequests: Observable<NodeSplitRequest> = this.nodeSplitSubject.asObservable();

	private readonly nodeDeleteSubject = new Subject<string[]>();
	public readonly nodeDeleteRequests: Observable<string[]> = this.nodeDeleteSubject.asObservable();

	private readonly subplanCreateSubject = new Subject<GraphPoint>();
	public readonly subplanCreateRequests: Observable<GraphPoint> = this.subplanCreateSubject.asObservable();

	private readonly subplanConvertSubject = new Subject<string[]>();
	public readonly subplanConvertRequests: Observable<string[]> = this.subplanConvertSubject.asObservable();

	private readonly subplanOpenSubject = new Subject<string>();
	public readonly subplanOpenRequests: Observable<string> = this.subplanOpenSubject.asObservable();

	private readonly subplanScaleSubject = new Subject<SubplanScaleRequest>();
	public readonly subplanScaleRequests: Observable<SubplanScaleRequest> = this.subplanScaleSubject.asObservable();

	private readonly subplanBuildCountSubject = new Subject<SubplanBuildCountRequest>();
	public readonly subplanBuildCountRequests: Observable<SubplanBuildCountRequest> = this.subplanBuildCountSubject.asObservable();

	private readonly recipeDisableSubject = new Subject<string>();
	public readonly recipeDisableRequests: Observable<string> = this.recipeDisableSubject.asObservable();

	private readonly machineDisableSubject = new Subject<string>();
	public readonly machineDisableRequests: Observable<string> = this.machineDisableSubject.asObservable();

	private readonly byproductDisableSubject = new Subject<string>();
	public readonly byproductDisableRequests: Observable<string> = this.byproductDisableSubject.asObservable();

	private readonly fuelDisableSubject = new Subject<FuelDisableRequest>();
	public readonly fuelDisableRequests: Observable<FuelDisableRequest> = this.fuelDisableSubject.asObservable();

	private readonly generatorDisableSubject = new Subject<string>();
	public readonly generatorDisableRequests: Observable<string> = this.generatorDisableSubject.asObservable();

	private readonly productRemoveSubject = new Subject<string>();
	public readonly productRemoveRequests: Observable<string> = this.productRemoveSubject.asObservable();

	private readonly resourceDisableSubject = new Subject<string>();
	public readonly resourceDisableRequests: Observable<string> = this.resourceDisableSubject.asObservable();

	private readonly inputRemoveSubject = new Subject<string>();
	public readonly inputRemoveRequests: Observable<string> = this.inputRemoveSubject.asObservable();

	private readonly undoSubject = new Subject<void>();
	public readonly undoRequests: Observable<void> = this.undoSubject.asObservable();

	private readonly redoSubject = new Subject<void>();
	public readonly redoRequests: Observable<void> = this.redoSubject.asObservable();

	private readonly isCalculatingSignal = signal(false);
	public readonly isCalculating: Signal<boolean> = this.isCalculatingSignal.asReadonly();

	private readonly solveErrorSignal = signal<string | null>(null);
	public readonly solveError: Signal<string | null> = this.solveErrorSignal.asReadonly();

	private readonly solveErrorDetailSignal = signal<string | null>(null);
	public readonly solveErrorDetail: Signal<string | null> = this.solveErrorDetailSignal.asReadonly();

	public requestCalculate(): void
	{
		this.calculateSubject.next();
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

	public requestNodeDone(request: NodeDoneRequest): void
	{
		this.nodeDoneSubject.next(request);
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

	public requestNodeSplit(request: NodeSplitRequest): void
	{
		this.nodeSplitSubject.next(request);
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

	public requestSubplanScale(request: SubplanScaleRequest): void
	{
		this.subplanScaleSubject.next(request);
	}

	public requestSubplanBuildCount(request: SubplanBuildCountRequest): void
	{
		this.subplanBuildCountSubject.next(request);
	}

	public requestRecipeDisable(recipeClassName: string): void
	{
		this.recipeDisableSubject.next(recipeClassName);
	}

	public requestMachineDisable(machineClassName: string): void
	{
		this.machineDisableSubject.next(machineClassName);
	}

	public requestByproductDisable(itemClassName: string): void
	{
		this.byproductDisableSubject.next(itemClassName);
	}

	public requestFuelDisable(request: FuelDisableRequest): void
	{
		this.fuelDisableSubject.next(request);
	}

	public requestGeneratorDisable(generatorClassName: string): void
	{
		this.generatorDisableSubject.next(generatorClassName);
	}

	public requestProductRemove(itemClassName: string): void
	{
		this.productRemoveSubject.next(itemClassName);
	}

	public requestResourceDisable(resourceClassName: string): void
	{
		this.resourceDisableSubject.next(resourceClassName);
	}

	public requestInputRemove(itemClassName: string): void
	{
		this.inputRemoveSubject.next(itemClassName);
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
