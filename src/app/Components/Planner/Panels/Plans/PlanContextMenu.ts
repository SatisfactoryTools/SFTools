import {faClone, faImage, faPen, faRotateLeft, faShareNodes, faXmark} from '@fortawesome/free-solid-svg-icons';
import {ContextMenuItem} from '@src/Components/Planner/ContextMenu/ContextMenuItem';
import {PlannerContextMenu} from '@src/Components/Planner/ContextMenu/PlannerContextMenu';
import {PlanTreeMenuHost} from '@src/Components/Planner/Panels/Plans/PlanTreeMenuHost';
import {Plan} from '@src/Model/Planner/Plan';

/**
 * Context menu shown when right-clicking a plan or subplan row in the Plans
 * tree. A subplan lives inside its parent's graph, so cloning it adds the
 * copy's node there and deleting it removes its node from there.
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

		// Cloning a subplan copies it into the same parent plan, which also
		// gets a node for the copy (see PlanManager.clonePlan).
		items.push({
			label: this.plan.parentPlanId !== null ? 'Clone subplan' : 'Clone plan',
			icon: faClone,
			hotkey: 'plans.clonePlan',
			action: () => this.host.clonePlan(this.plan, this.displayName),
		});

		// Always offered - sharing needs an account, and sharePlan() says so
		// (and offers to sign in) rather than the entry quietly disappearing.
		items.push({
			label: 'Share…',
			icon: faShareNodes,
			hotkey: 'plans.sharePlan',
			action: () => this.host.sharePlan(this.plan),
		});

		// Deleting a subplan also removes its node from the parent plan's graph
		// (see PlanManager.deletePlan).
		items.push({
			label: this.plan.parentPlanId !== null ? 'Delete subplan' : 'Delete plan',
			icon: faXmark,
			hotkey: 'plans.deletePlan',
			action: () => this.host.deletePlan(this.plan),
		});

		return items;
	}

}
