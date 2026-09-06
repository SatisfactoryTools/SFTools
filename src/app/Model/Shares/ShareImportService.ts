import {Injectable} from '@angular/core';
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

}
