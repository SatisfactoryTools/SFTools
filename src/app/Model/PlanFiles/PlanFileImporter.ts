import {Injectable} from '@angular/core';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {Folder} from '@src/Model/Planner/Folder';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanVersionConverter} from '@src/Model/PlanFiles/Conversion/PlanVersionConverter';
import {PlanFile} from '@src/Model/PlanFiles/PlanFile';
import {PlanImportPreview} from '@src/Model/PlanFiles/PlanImportPreview';
import {SourceVersionLoader} from '@src/Model/PlanFiles/SourceVersionLoader';
import {SharePayloadHydrator} from '@src/Model/Shares/SharePayloadHydrator';

@Injectable({providedIn: 'root'})
export class PlanFileImporter
{

	public constructor(
		private readonly hydrator: SharePayloadHydrator,
		private readonly converter: PlanVersionConverter,
		private readonly sourceVersions: SourceVersionLoader,
		private readonly versionManager: VersionManager,
		private readonly planManager: PlanManager,
	)
	{
	}

	public async prepare(file: PlanFile): Promise<PlanImportPreview>
	{
		const target = this.versionManager.activeVersionData();
		if (target === null) {
			throw new Error('The game data of this version is not loaded yet.');
		}
		const source = await this.sourceVersions.load(file.version);
		// Every import is a copy with fresh ids, so importing the same file twice never collides.
		const hydration = this.hydrator.hydrateRoots(file.roots);
		return {
			file,
			sameVersion: this.versionManager.activeVersion()?.id === file.version.id,
			sourceLoaded: source !== null,
			conversion: this.converter.convert(hydration.folders, hydration.plans, source, target),
			roots: file.roots.map(root => ({id: hydration.idMap.get(root.node.id)!, type: root.type})),
		};
	}

	public apply(preview: PlanImportPreview, folderName: string): Folder
	{
		const folder: Folder = {
			id: crypto.randomUUID(),
			name: folderName,
			parentId: null,
			settings: null,
			fixedGroups: [],
			resourcePool: false,
			revision: null,
		};
		const rootOrder = new Map(preview.roots.map((root, index) => [root.id, index]));
		const folders = preview.conversion.folders.map(entry => rootOrder.has(entry.id)
			? {...entry, parentId: folder.id, order: rootOrder.get(entry.id)}
			: entry);
		const plans = preview.conversion.plans.map(entry => rootOrder.has(entry.id)
			? {...entry, folderId: folder.id, parentPlanId: null, order: rootOrder.get(entry.id)}
			: entry);
		this.planManager.importTree([folder, ...folders], plans, {id: folder.id, type: 'folder'});
		this.planManager.setActiveFolder(folder.id);
		return folder;
	}

}
