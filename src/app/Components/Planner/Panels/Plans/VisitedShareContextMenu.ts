import {faDownload, faLink, faXmark} from '@fortawesome/free-solid-svg-icons';
import {ContextMenuItem} from '@src/Components/Planner/ContextMenu/ContextMenuItem';
import {PlannerContextMenu} from '@src/Components/Planner/ContextMenu/PlannerContextMenu';
import {PlanTreeMenuHost} from '@src/Components/Planner/Panels/Plans/PlanTreeMenuHost';
import {VisitedShare} from '@src/Model/Shares/VisitedShare';

/**
 * Context menu of a "Shared plans" row. Shares are read-only; "Add to my
 * plans" copies the share into the user's own plans of its game version -
 * switching the planner to that version first when another one is active
 * (plans are version-scoped). Removal is non-destructive - reopening the
 * link brings the entry back.
 */
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
				label: 'Remove from shared plans',
				icon: faXmark,
				action: () => this.host.removeVisitedShare(this.share),
			},
		];
	}

}
