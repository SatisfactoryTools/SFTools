import {faFolderPlus, faPen, faPlus, faShareNodes, faXmark} from '@fortawesome/free-solid-svg-icons';
import {ContextMenuItem} from '@src/Components/Planner/ContextMenu/ContextMenuItem';
import {PlannerContextMenu} from '@src/Components/Planner/ContextMenu/PlannerContextMenu';
import {PlanTreeMenuHost} from '@src/Components/Planner/Panels/Plans/PlanTreeMenuHost';

/**
 * Context menu shown when right-clicking a folder row in the Plans tree.
 */
export class FolderContextMenu extends PlannerContextMenu
{

	public constructor(
		private readonly folderId: string,
		private readonly folderName: string,
		private readonly host: PlanTreeMenuHost,
	)
	{
		super();
	}

	public override getTitle(): string
	{
		return this.folderName;
	}

	public getItems(): ContextMenuItem[]
	{
		const items: ContextMenuItem[] = [
			{
				label: 'Rename…',
				icon: faPen,
				action: () => this.host.startRenameFolder(this.folderId, this.folderName),
			},
			{
				label: 'New subfolder…',
				icon: faFolderPlus,
				action: () => this.host.startCreateFolder(this.folderId),
			},
			{
				label: 'New plan…',
				icon: faPlus,
				action: () => this.host.startCreatePlan(this.folderId),
			},
		];

		if (this.host.canShare()) {
			items.push({
				label: 'Share…',
				icon: faShareNodes,
				action: () => this.host.shareFolder(this.folderId, this.folderName),
			});
		}

		items.push({
			label: 'Delete folder',
			icon: faXmark,
			action: () => this.host.deleteFolder(this.folderId, this.folderName),
		});

		return items;
	}

}
