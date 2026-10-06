import {Injectable} from '@angular/core';
import {SharedPlanNode} from '@src/Model/API/Schema/Shares/SharedPlanNode';
import {SharePayload} from '@src/Model/API/Schema/Shares/SharePayload';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {SharePayloadHydrator} from '@src/Model/Shares/SharePayloadHydrator';

@Injectable({providedIn: 'root'})
export class ShareImportService
{

	public constructor(
		private readonly hydrator: SharePayloadHydrator,
		private readonly planManager: PlanManager,
	)
	{
	}

	public import(payload: SharePayload, folderId: string | null = null): Map<string, string>
	{
		const hydration = this.hydrator.hydrate(payload);
		const rootId = hydration.idMap.get(payload.root.id)!;
		this.planManager.importTree(hydration.folders, hydration.plans, {id: rootId, type: payload.type}, folderId);
		return hydration.idMap;
	}

	public importPlanNode(root: SharedPlanNode, folderId: string | null = null): string
	{
		const hydration = this.hydrator.hydratePlanCopy(root);
		const rootId = hydration.idMap.get(root.id)!;
		this.planManager.importTree(hydration.folders, hydration.plans, {id: rootId, type: 'plan'}, folderId);
		return rootId;
	}

}
