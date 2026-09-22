import {SharedPlanNode} from '@src/Model/API/Schema/Shares/SharedPlanNode';
import {ShareVersion} from '@src/Model/API/Schema/Shares/ShareVersion';

/**
 * Response of GET /v1/plans/{uuid} - the live, read-only view of a plan behind
 * its own planner URL. Same node shape as a share payload (the viewer hydrates
 * both the same way), but nothing here is frozen: it is the plan as it is now.
 */
export interface PlanLinkPayload
{
	/** The plan UUID - the same one the URL carries. */
	plan: string;
	type: 'plan';
	updatedAt: string;
	version: ShareVersion;
	root: SharedPlanNode;
}
