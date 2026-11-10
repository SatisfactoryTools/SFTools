import {Component, ChangeDetectionStrategy, Signal, computed} from '@angular/core';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {PlannerGraphService} from '@src/Components/Planner/PlannerGraphService';
import {EdgeEditorComponent} from '@src/Components/Planner/Panels/Inspector/EdgeEditor/EdgeEditorComponent';
import {AmountNodeEditorComponent} from '@src/Components/Planner/Panels/Inspector/AmountNodeEditor/AmountNodeEditorComponent';
import {RecipeNodeEditorComponent} from '@src/Components/Planner/Panels/Inspector/RecipeNodeEditor/RecipeNodeEditorComponent';
import {SubplanNodeEditorComponent} from '@src/Components/Planner/Panels/Inspector/SubplanNodeEditor/SubplanNodeEditorComponent';
import {AugmenterNode} from '@src/Model/Planner/Solver/Response/AugmenterNode';
import {GeneratorNode} from '@src/Model/Planner/Solver/Response/GeneratorNode';
import {ItemAmountNode} from '@src/Model/Planner/Solver/Response/ItemAmountNode';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {GraphEdge} from '@src/Model/Planner/Graph/GraphEdge';
import {RecipeNode} from '@src/Model/Planner/Solver/Response/RecipeNode';
import {SubplanNode} from '@src/Model/Planner/Solver/Response/SubplanNode';
import {PlanManager} from '@src/Model/Planner/PlanManager';

@Component({
	selector: 'planner-inspector',
	changeDetection: ChangeDetectionStrategy.Eager,
	templateUrl: './PlannerInspectorComponent.html',
	imports: [EdgeEditorComponent, AmountNodeEditorComponent, RecipeNodeEditorComponent, SubplanNodeEditorComponent, InfoNoteComponent],
})
export class PlannerInspectorComponent
{

	public readonly selectedNodes: Signal<Node[]>;
	public readonly selectedEdge: Signal<GraphEdge | null>;
	public readonly singleRecipeNode: Signal<RecipeNode | null>;
	public readonly singleSubplanNode: Signal<SubplanNode | null>;
	public readonly singleAmountNode: Signal<Node | null>;

	public readonly isAugmenterNode: Signal<boolean>;
	public readonly readOnly: Signal<boolean>;
	public readonly readOnlyNote: Signal<string>;

	public constructor(
		private readonly plannerGraph: PlannerGraphService,
		planManager: PlanManager,
	)
	{
		this.selectedNodes = plannerGraph.selectedNodes;
		this.selectedEdge = plannerGraph.selectedEdge;
		this.readOnly = planManager.activePlanReadOnly;
		this.readOnlyNote = computed(() => planManager.activePlanShared()
			? 'This shared plan is read-only.'
			: 'This plan is only on this device. Add it to your plans to edit it.');
		this.singleRecipeNode = computed(() => {
			const nodes = this.selectedNodes();
			return nodes.length === 1 && nodes[0] instanceof RecipeNode ? nodes[0] : null;
		});
		this.singleSubplanNode = computed(() => {
			const nodes = this.selectedNodes();
			return nodes.length === 1 && nodes[0] instanceof SubplanNode ? nodes[0] : null;
		});
		// Augmenters are a Power tab setting the solver restates as a node, so there is nothing to edit here.
		this.isAugmenterNode = computed(() => {
			const nodes = this.selectedNodes();
			return nodes.length === 1 && nodes[0] instanceof AugmenterNode;
		});
		this.singleAmountNode = computed(() => {
			const nodes = this.selectedNodes();
			return nodes.length === 1 && (nodes[0] instanceof ItemAmountNode || nodes[0] instanceof GeneratorNode) ? nodes[0] : null;
		});
	}

}
