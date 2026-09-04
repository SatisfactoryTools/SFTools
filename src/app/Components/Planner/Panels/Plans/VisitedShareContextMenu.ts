import {faLink, faXmark} from '@fortawesome/free-solid-svg-icons';
import {ContextMenuItem} from '@src/Components/Planner/ContextMenu/ContextMenuItem';
import {PlannerContextMenu} from '@src/Components/Planner/ContextMenu/PlannerContextMenu';
import {PlanTreeMenuHost} from '@src/Components/Planner/Panels/Plans/PlanTreeMenuHost';
import {VisitedShare} from '@src/Model/Shares/VisitedShare';

/**
 * Context menu of a "Shared plans" row. Deliberately minimal: shares are
 * read-only, and "Add to my plans" lives in the Production request panel
 * (where the share's version is guaranteed active), not here. Removal is
 * non-destructive - reopening the link brings the entry back.
 */
export class VisitedShareContextMenu extends PlannerContextMenu
{

	public constructor(
		private readonly share: VisitedShare,
		private readonly host: PlanTreeMenuHost,
	)
	{
		super();
	}

	public override getTitle(): string
	{
		return this.share.name;
	}

	public getItems(): ContextMenuItem[]
	{
		return [
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
