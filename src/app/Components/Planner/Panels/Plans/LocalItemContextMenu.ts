import {faDownload} from '@fortawesome/free-solid-svg-icons';
import {ContextMenuItem} from '@src/Components/Planner/ContextMenu/ContextMenuItem';
import {PlannerContextMenu} from '@src/Components/Planner/ContextMenu/PlannerContextMenu';
import {PlanTreeMenuHost} from '@src/Components/Planner/Panels/Plans/PlanTreeMenuHost';

/**
 * Context menu of a "Plans on this device" row: the rows are read-only
 * migration leftovers, so the only action is moving the plan or folder
 * (with everything inside) into the account - same as dragging it onto
 * "Your plans".
 */
export class LocalItemContextMenu extends PlannerContextMenu
{

	public constructor(
		private readonly id: string,
		private readonly kind: 'plan' | 'folder',
		private readonly name: string,
		private readonly host: PlanTreeMenuHost,
	)
	{
		super();
	}

	public override getTitle(): string
	{
		return this.name;
	}

	public getItems(): ContextMenuItem[]
	{
		return [
			{
				label: 'Add to my plans',
				icon: faDownload,
				action: () => this.host.addLocalToMyPlans(this.id, this.kind),
			},
		];
	}

}
