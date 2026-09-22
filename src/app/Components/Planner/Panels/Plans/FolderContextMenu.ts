import {faClone, faFolderPlus, faPen, faPlus, faShareNodes, faXmark} from '@fortawesome/free-solid-svg-icons';
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
				hotkey: 'plans.renameFolder',
				action: () => this.host.startRenameFolder(this.folderId, this.folderName),
			},
			{
				label: 'New subfolder…',
				icon: faFolderPlus,
				hotkey: 'plans.newFolder',
				action: () => this.host.startCreateFolder(this.folderId),
			},
			{
				label: 'New plan…',
				icon: faPlus,
				hotkey: 'plans.newPlan',
				action: () => this.host.startCreatePlan(this.folderId),
			},
			{
				label: 'Clone folder',
				icon: faClone,
				hotkey: 'plans.cloneFolder',
				action: () => this.host.cloneFolder(this.folderId),
			},
		];

		// Always offered - sharing needs an account, and shareFolder() says so
		// (and offers to sign in) rather than the entry quietly disappearing.
		items.push({
			label: 'Share…',
			icon: faShareNodes,
			hotkey: 'plans.shareFolder',
			action: () => this.host.shareFolder(this.folderId, this.folderName),
		});

		items.push({
			label: 'Delete folder',
			icon: faXmark,
			hotkey: 'plans.deleteFolder',
			action: () => this.host.deleteFolder(this.folderId, this.folderName),
		});

		return items;
	}

}
