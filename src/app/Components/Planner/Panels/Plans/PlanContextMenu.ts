import {faClone, faImage, faPen, faRotateLeft, faShareNodes, faXmark} from '@fortawesome/free-solid-svg-icons';
import {ContextMenuItem} from '@src/Components/Planner/ContextMenu/ContextMenuItem';
import {PlannerContextMenu} from '@src/Components/Planner/ContextMenu/PlannerContextMenu';
import {PlanTreeMenuHost} from '@src/Components/Planner/Panels/Plans/PlanTreeMenuHost';
import {Plan} from '@src/Model/Planner/Plan';

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
				hotkey: 'plans.renamePlan',
				action: () => this.host.startRenamePlan(this.plan.id, this.plan.name),
			},
			{
				label: 'Pick an icon…',
				icon: faImage,
				hotkey: 'plans.pickPlanIcon',
				action: () => this.host.pickPlanIcon(this.plan),
			},
		];

		if (typeof this.plan.iconClassName === 'string') {
			items.push({
				label: 'Reset icon to default',
				icon: faRotateLeft,
				hotkey: 'plans.resetPlanIcon',
				action: () => this.host.resetPlanIcon(this.plan),
			});
		}

		items.push({
			label: this.plan.parentPlanId !== null ? 'Clone subplan' : 'Clone plan',
			icon: faClone,
			hotkey: 'plans.clonePlan',
			action: () => this.host.clonePlan(this.plan, this.displayName),
		});

		// Always offered: sharePlan() explains the account requirement rather than the entry quietly disappearing.
		items.push({
			label: 'Share…',
			icon: faShareNodes,
			hotkey: 'plans.sharePlan',
			action: () => this.host.sharePlan(this.plan),
		});

		items.push({
			label: this.plan.parentPlanId !== null ? 'Delete subplan' : 'Delete plan',
			icon: faXmark,
			hotkey: 'plans.deletePlan',
			action: () => this.host.deletePlan(this.plan),
		});

		return items;
	}

}
