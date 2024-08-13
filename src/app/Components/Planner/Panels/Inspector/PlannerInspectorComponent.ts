import {Component, ChangeDetectionStrategy, Signal, computed} from '@angular/core';
import {PlannerGraphService} from '@src/Components/Planner/PlannerGraphService';
import {AmountNodeEditorComponent} from '@src/Components/Planner/Panels/Inspector/AmountNodeEditor/AmountNodeEditorComponent';
import {RecipeNodeEditorComponent} from '@src/Components/Planner/Panels/Inspector/RecipeNodeEditor/RecipeNodeEditorComponent';
import {SubplanNodeViewComponent} from '@src/Components/Planner/Panels/Inspector/SubplanNodeView/SubplanNodeViewComponent';
import {GeneratorNode} from '@src/Model/Planner/Solver/Response/GeneratorNode';
import {ItemAmountNode} from '@src/Model/Planner/Solver/Response/ItemAmountNode';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {RecipeNode} from '@src/Model/Planner/Solver/Response/RecipeNode';
import {SubplanNode} from '@src/Model/Planner/Solver/Response/SubplanNode';

@Component({
	selector: 'planner-inspector',
	changeDetection: ChangeDetectionStrategy.Eager,
	templateUrl: './PlannerInspectorComponent.html',
	imports: [AmountNodeEditorComponent, RecipeNodeEditorComponent, SubplanNodeViewComponent],
})
export class PlannerInspectorComponent
{

	public readonly selectedNodes: Signal<Node[]>;
	public readonly singleRecipeNode: Signal<RecipeNode | null>;
	public readonly singleSubplanNode: Signal<SubplanNode | null>;
	/** A lone selected single-scalar node (item nodes and generators) - edited through the amount editor. */
	public readonly singleAmountNode: Signal<Node | null>;

	public constructor(private readonly plannerGraph: PlannerGraphService)
	{
		this.selectedNodes = plannerGraph.selectedNodes;
		this.singleRecipeNode = computed(() => {
			const nodes = this.selectedNodes();
			return nodes.length === 1 && nodes[0] instanceof RecipeNode ? nodes[0] : null;
		});
		this.singleSubplanNode = computed(() => {
			const nodes = this.selectedNodes();
			return nodes.length === 1 && nodes[0] instanceof SubplanNode ? nodes[0] : null;
		});
		this.singleAmountNode = computed(() => {
			const nodes = this.selectedNodes();
			return nodes.length === 1 && (nodes[0] instanceof ItemAmountNode || nodes[0] instanceof GeneratorNode) ? nodes[0] : null;
		});
	}

}
