import {faCheck, faCompress, faCrosshairs, faExpand, faRotateLeft, faTrashCan} from '@fortawesome/free-solid-svg-icons';
import {ContextMenuItem} from '@src/Components/Planner/ContextMenu/ContextMenuItem';
import {EdgeAmountAction} from '@src/Components/Planner/ContextMenu/EdgeAmountAction';
import {PlannerContextMenu} from '@src/Components/Planner/ContextMenu/PlannerContextMenu';
import {PanelLayoutService} from '@src/Components/Planner/Panel/PanelLayoutService';
import {PlannerActionsService} from '@src/Components/Planner/PlannerActionsService';
import {PlannerGraphService} from '@src/Components/Planner/PlannerGraphService';
import {GraphEdge} from '@src/Model/Planner/Graph/GraphEdge';

export class EdgeContextMenu extends PlannerContextMenu
{

	public constructor(
		private readonly edge: GraphEdge,
		private readonly title: string,
		private readonly minimise: EdgeAmountAction | null,
		private readonly maximise: EdgeAmountAction | null,
		private readonly actions: PlannerActionsService,
		private readonly panelLayout: PanelLayoutService,
		private readonly plannerGraph: PlannerGraphService,
	)
	{
		super();
	}

	public override getTitle(): string
	{
		return this.title;
	}

	public getItems(): ContextMenuItem[]
	{
		return [
			{
				label: 'Inspect connection…',
				icon: faCrosshairs,
				hotkey: 'graph.inspectNode',
				action: () => {
					this.plannerGraph.selectEdge(this.edge);
					// focusPanel, not openPanel: an inspector hidden behind another tab must come to the front.
					this.panelLayout.focusPanel('inspector');
				},
			},
			{
				label: this.edge.done ? 'Mark as not done' : 'Mark as done',
				icon: this.edge.done ? faRotateLeft : faCheck,
				hotkey: 'graph.toggleDone',
				action: () => this.actions.requestEdgeDone({edges: [this.edge], done: !this.edge.done}),
			},
			this.amountItem('Minimise', faCompress, this.minimise),
			this.amountItem('Maximise', faExpand, this.maximise),
			{
				label: 'Delete connection',
				icon: faTrashCan,
				hotkey: 'graph.deleteNode',
				action: () => this.actions.requestEdgeDelete(this.edge),
			},
		];
	}

	private amountItem(fallbackLabel: string, icon: ContextMenuItem['icon'], action: EdgeAmountAction | null): ContextMenuItem
	{
		return {
			label: action?.label ?? fallbackLabel,
			icon,
			disabled: action === null,
			action: () => {
				if (action) {
					this.actions.requestEdgeAmount({edge: this.edge, amount: action.amount});
				}
			},
		};
	}

}
