import {Injectable} from '@angular/core';
import {SharedFolderNode} from '@src/Model/API/Schema/Shares/SharedFolderNode';
import {SharedPlanNode} from '@src/Model/API/Schema/Shares/SharedPlanNode';
import {SharePayload} from '@src/Model/API/Schema/Shares/SharePayload';
import {IconUrlService} from '@src/Model/Data/IconUrlService';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {PageMeta} from '@src/Model/Meta/PageMeta';
import {ShareTreeCache} from '@src/Model/Shares/ShareTreeCache';

/**
 * Page metadata of a share link: the shared plan's or folder's name and a
 * description, the plan's icon when its version's data is loaded. The same
 * rules as the API's MetaResolver::share() - keep them in sync.
 */
@Injectable({providedIn: 'root'})
export class ShareMetaResolver
{

	public constructor(
		private readonly versionManager: VersionManager,
		private readonly shareTrees: ShareTreeCache,
		private readonly iconUrls: IconUrlService,
	)
	{
	}

	public resolve(payload: SharePayload): PageMeta
	{
		const version = this.versionManager.versions().find(v => v.id === payload.version.id)?.name ?? payload.version.name;
		if (payload.type === 'folder') {
			const count = this.countPlans(payload.root as SharedFolderNode);
			return {
				title: payload.root.name,
				description: `Shared folder with ${count} ${count === 1 ? 'plan' : 'plans'} for Satisfactory (${version}).`,
			};
		}

		const description = (payload.root as SharedPlanNode).description ?? '';
		return {
			title: payload.root.name,
			description: description.trim() !== '' ? description : `Shared production plan for Satisfactory (${version}).`,
			image: this.planImage(payload),
		};
	}

	/** Plans in the folder tree, subfolders included; subplans belong to their plan and do not count. */
	private countPlans(folder: SharedFolderNode): number
	{
		return folder.plans.length + folder.children.reduce((sum, child) => sum + this.countPlans(child), 0);
	}

	/** Only once the share's own version is the active one - its data holds the icon. */
	private planImage(payload: SharePayload): string | null
	{
		const data = this.versionManager.activeVersion()?.id === payload.version.id ? this.versionManager.activeVersionData() : null;
		const className = this.shareTrees.buildTree(payload).iconClassName;
		return data !== null && className !== null ? this.iconUrls.url(data.iconForClassName(className), 256) : null;
	}

}
