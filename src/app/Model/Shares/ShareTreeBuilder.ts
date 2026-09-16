import {Injectable} from '@angular/core';
import {ShareCreateFolderNode} from '@src/Model/API/Schema/Shares/ShareCreateFolderNode';
import {ShareCreatePlanNode} from '@src/Model/API/Schema/Shares/ShareCreatePlanNode';
import {Folder} from '@src/Model/Planner/Folder';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanDataSerializer} from '@src/Model/Planner/PlanDataSerializer';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanStore} from '@src/Model/Planner/PlanStore';

/**
 * Packs a plan or folder subtree into the tree POST /v1/shares accepts in its
 * `root` field (see anonymous-shares.md). Used for plans the server does not
 * have: everything a signed-out user makes, and the "On this device" plans a
 * signed-in user has not moved into their account yet.
 *
 * Ids are sent as they are - inside a share they only tie a folder to the
 * plans under it, and copying a share re-mints them anyway.
 */
@Injectable({providedIn: 'root'})
export class ShareTreeBuilder
{

	public plan(plan: Plan, store: PlanStore): ShareCreatePlanNode
	{
		return this.planNode(plan, store, new Set());
	}

	public folder(folder: Folder, store: PlanStore): ShareCreateFolderNode
	{
		return this.folderNode(folder, store, new Set());
	}

	/**
	 * @param ancestors The ids on the path down here - a corrupted cycle ends
	 *                  the recursion instead of hanging the browser.
	 */
	private planNode(plan: Plan, store: PlanStore, ancestors: ReadonlySet<string>): ShareCreatePlanNode
	{
		const path = new Set([...ancestors, plan.id]);
		return {
			id: plan.id,
			name: plan.name,
			description: plan.description || null,
			data: PlanDataSerializer.plan(plan),
			subplans: store.plans
				.filter(candidate => candidate.parentPlanId === plan.id && !path.has(candidate.id))
				.sort(PlanManager.bySiblingOrder)
				.map(subplan => this.planNode(subplan, store, path)),
		};
	}

	private folderNode(folder: Folder, store: PlanStore, ancestors: ReadonlySet<string>): ShareCreateFolderNode
	{
		const path = new Set([...ancestors, folder.id]);
		return {
			id: folder.id,
			name: folder.name,
			data: PlanDataSerializer.folder(folder),
			children: store.folders
				.filter(candidate => candidate.parentId === folder.id && !path.has(candidate.id))
				.sort(PlanManager.bySiblingOrder)
				.map(child => this.folderNode(child, store, path)),
			plans: store.plans
				.filter(plan => plan.folderId === folder.id && plan.parentPlanId === null)
				.sort(PlanManager.bySiblingOrder)
				.map(plan => this.planNode(plan, store, path)),
		};
	}

}
