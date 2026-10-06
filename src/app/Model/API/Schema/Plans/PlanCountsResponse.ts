import {VersionPlanCount} from '@src/Model/API/Schema/Plans/VersionPlanCount';

export interface PlanCountsResponse
{
	readonly versions: Record<string, VersionPlanCount>;
}
