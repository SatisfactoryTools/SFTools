import {faDownload, faShareNodes} from '@fortawesome/free-solid-svg-icons';
import {ContextMenuItem} from '@src/Components/Planner/ContextMenu/ContextMenuItem';
import {PlannerContextMenu} from '@src/Components/Planner/ContextMenu/PlannerContextMenu';
import {PlanTreeMenuHost} from '@src/Components/Planner/Panels/Plans/PlanTreeMenuHost';

/**
 * Context menu of an "On this device" row: the plans open read-only by click,
 * so the actions here are moving the plan or folder (with everything inside)
 * into the account - same as dragging it onto "Your plans" - and sharing it,
 * which sends its tree with the request since the server has no copy of it.
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
			{
				label: 'Share…',
				icon: faShareNodes,
				action: () => this.host.shareLocalItem(this.id, this.kind, this.name),
			},
		];
	}

}
