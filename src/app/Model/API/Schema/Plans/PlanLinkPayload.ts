import {SharedPlanNode} from '@src/Model/API/Schema/Shares/SharedPlanNode';
import {ShareVersion} from '@src/Model/API/Schema/Shares/ShareVersion';

export interface PlanLinkPayload
{
	plan: string;
	type: 'plan';
	updatedAt: string;
	version: ShareVersion;
	root: SharedPlanNode;
}
