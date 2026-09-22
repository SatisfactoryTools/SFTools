import {Injectable} from '@angular/core';
import {SharedPlanNode} from '@src/Model/API/Schema/Shares/SharedPlanNode';
import {SharePayload} from '@src/Model/API/Schema/Shares/SharePayload';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {SharePayloadHydrator} from '@src/Model/Shares/SharePayloadHydrator';

/**
 * Copies a frozen share into the viewer's own plans (fresh UUIDs, subplan
 * references remapped - see SharePayloadHydrator).
 */
@Injectable({providedIn: 'root'})
export class ShareImportService
{

	public constructor(
		private readonly hydrator: SharePayloadHydrator,
		private readonly planManager: PlanManager,
	)
	{
	}

	/**
	 * Copies the share into the given folder (null = top level), placed last.
	 * Returns the payload-id → copied-id map, so callers can locate a specific copy.
	 */
	public import(payload: SharePayload, folderId: string | null = null): Map<string, string>
	{
		const hydration = this.hydrator.hydrate(payload);
		const rootId = hydration.idMap.get(payload.root.id)!;
		this.planManager.importTree(hydration.folders, hydration.plans, {id: rootId, type: payload.type}, folderId);
		return hydration.idMap;
	}

	/**
	 * The same copy for a plan opened by its own URL: the tree is hydrated under fresh
	 * ids here (unlike the read-only view, which keeps the originals), so the copy is a
	 * plan of the viewer's own and never collides with the original.
	 *
	 * Returns the id the copied root plan got.
	 */
	public importPlanNode(root: SharedPlanNode, folderId: string | null = null): string
	{
		const hydration = this.hydrator.hydratePlanCopy(root);
		const rootId = hydration.idMap.get(root.id)!;
		this.planManager.importTree(hydration.folders, hydration.plans, {id: rootId, type: 'plan'}, folderId);
		return rootId;
	}

}
