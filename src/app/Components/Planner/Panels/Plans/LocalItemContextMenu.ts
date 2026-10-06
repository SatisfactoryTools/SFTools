import {faDownload, faShareNodes} from '@fortawesome/free-solid-svg-icons';
import {ContextMenuItem} from '@src/Components/Planner/ContextMenu/ContextMenuItem';
import {PlannerContextMenu} from '@src/Components/Planner/ContextMenu/PlannerContextMenu';
import {PlanTreeMenuHost} from '@src/Components/Planner/Panels/Plans/PlanTreeMenuHost';

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
