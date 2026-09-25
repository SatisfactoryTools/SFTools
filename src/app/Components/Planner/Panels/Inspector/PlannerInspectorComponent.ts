import {Component, ChangeDetectionStrategy, Signal, computed} from '@angular/core';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {PlannerGraphService} from '@src/Components/Planner/PlannerGraphService';
import {AmountNodeEditorComponent} from '@src/Components/Planner/Panels/Inspector/AmountNodeEditor/AmountNodeEditorComponent';
import {RecipeNodeEditorComponent} from '@src/Components/Planner/Panels/Inspector/RecipeNodeEditor/RecipeNodeEditorComponent';
import {SubplanNodeEditorComponent} from '@src/Components/Planner/Panels/Inspector/SubplanNodeEditor/SubplanNodeEditorComponent';
import {AugmenterNode} from '@src/Model/Planner/Solver/Response/AugmenterNode';
import {GeneratorNode} from '@src/Model/Planner/Solver/Response/GeneratorNode';
import {ItemAmountNode} from '@src/Model/Planner/Solver/Response/ItemAmountNode';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {RecipeNode} from '@src/Model/Planner/Solver/Response/RecipeNode';
import {SubplanNode} from '@src/Model/Planner/Solver/Response/SubplanNode';
import {PlanManager} from '@src/Model/Planner/PlanManager';

@Component({
	selector: 'planner-inspector',
	changeDetection: ChangeDetectionStrategy.Eager,
	templateUrl: './PlannerInspectorComponent.html',
	imports: [AmountNodeEditorComponent, RecipeNodeEditorComponent, SubplanNodeEditorComponent, InfoNoteComponent],
})
export class PlannerInspectorComponent
{

	public readonly selectedNodes: Signal<Node[]>;
	public readonly singleRecipeNode: Signal<RecipeNode | null>;
	public readonly singleSubplanNode: Signal<SubplanNode | null>;
	/** A lone selected single-scalar node (item nodes and generators) - edited through the amount editor. */
	public readonly singleAmountNode: Signal<Node | null>;

	/** A read-only plan (shared, or on this device while signed in) is inspected, never edited - the editors render disabled. */
	public readonly isAugmenterNode: Signal<boolean>;
	public readonly readOnly: Signal<boolean>;
	public readonly readOnlyNote: Signal<string>;

	public constructor(
		private readonly plannerGraph: PlannerGraphService,
		planManager: PlanManager,
	)
	{
		this.selectedNodes = plannerGraph.selectedNodes;
		this.readOnly = planManager.activePlanReadOnly;
		this.readOnlyNote = computed(() => planManager.activePlanShared()
			? 'Shared plan - read-only. You can look at the values but not change them.'
			: 'Plan on this device - read-only. Add it to your plans to change it.');
		this.singleRecipeNode = computed(() => {
			const nodes = this.selectedNodes();
			return nodes.length === 1 && nodes[0] instanceof RecipeNode ? nodes[0] : null;
		});
		this.singleSubplanNode = computed(() => {
			const nodes = this.selectedNodes();
			return nodes.length === 1 && nodes[0] instanceof SubplanNode ? nodes[0] : null;
		});
		// Augmenters are a Power tab setting the solver restates as a node, so
		// there is nothing to edit here - the inspector says where to go.
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
