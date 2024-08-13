import {faImage, faPen, faRotateLeft, faShareNodes, faXmark} from '@fortawesome/free-solid-svg-icons';
import {ContextMenuItem} from '@src/Components/Planner/ContextMenu/ContextMenuItem';
import {PlannerContextMenu} from '@src/Components/Planner/ContextMenu/PlannerContextMenu';
import {PlanTreeMenuHost} from '@src/Components/Planner/Panels/Plans/PlanTreeMenuHost';
import {Plan} from '@src/Model/Planner/Plan';

/**
 * Context menu shown when right-clicking a plan or subplan row in the Plans
 * tree. Subplans live inside their parent's graph, so they offer rename only -
 * they are deleted through the parent plan.
 */
export class PlanContextMenu extends PlannerContextMenu
{

	public constructor(
		private readonly plan: Plan,
		private readonly displayName: string,
		private readonly host: PlanTreeMenuHost,
	)
	{
		super();
	}

	public override getTitle(): string
	{
		return this.displayName;
	}

	public getItems(): ContextMenuItem[]
	{
		const items: ContextMenuItem[] = [
			{
				label: 'Rename…',
				icon: faPen,
				action: () => this.host.startRenamePlan(this.plan.id, this.plan.name),
			},
			{
				label: 'Pick an icon…',
				icon: faImage,
				action: () => this.host.pickPlanIcon(this.plan),
			},
		];

		if (typeof this.plan.iconClassName === 'string') {
			items.push({
				label: 'Reset icon to default',
				icon: faRotateLeft,
				action: () => this.host.resetPlanIcon(this.plan),
			});
		}

		if (this.host.canShare()) {
			items.push({
				label: 'Share…',
				icon: faShareNodes,
				action: () => this.host.sharePlan(this.plan),
			});
		}

		if (this.plan.parentPlanId === null) {
			items.push({
				label: 'Delete plan',
				icon: faXmark,
				action: () => this.host.deletePlan(this.plan),
			});
		}

		return items;
	}

}
