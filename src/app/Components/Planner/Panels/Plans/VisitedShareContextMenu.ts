import {faDownload, faLink, faXmark} from '@fortawesome/free-solid-svg-icons';
import {ContextMenuItem} from '@src/Components/Planner/ContextMenu/ContextMenuItem';
import {PlannerContextMenu} from '@src/Components/Planner/ContextMenu/PlannerContextMenu';
import {PlanTreeMenuHost} from '@src/Components/Planner/Panels/Plans/PlanTreeMenuHost';
import {VisitedShare} from '@src/Model/Shares/VisitedShare';

export class VisitedShareContextMenu extends PlannerContextMenu
{

	public constructor(
		private readonly share: VisitedShare,
		private readonly shownName: string,
		private readonly host: PlanTreeMenuHost,
	)
	{
		super();
	}

	public override getTitle(): string
	{
		return this.shownName;
	}

	public getItems(): ContextMenuItem[]
	{
		const sameVersion = this.host.isShareVersionActive(this.share);
		return [
			{
				label: sameVersion ? 'Add to my plans' : `Add to my plans (switches to ${this.share.version.name})`,
				icon: faDownload,
				action: () => this.host.addShareToMyPlans(this.share),
			},
			{
				label: 'Copy share link',
				icon: faLink,
				action: () => this.host.copyShareLink(this.share),
			},
			{
				label: 'Remove from this list',
				icon: faXmark,
				action: () => this.host.removeVisitedShare(this.share),
			},
		];
	}

}
