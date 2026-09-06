import {VersionPlanCount} from '@src/Model/API/Schema/Plans/VersionPlanCount';

/** Keyed by version UUID; a version missing from the map has no plans. */
export interface PlanCountsResponse
{
	readonly versions: Record<string, VersionPlanCount>;
}
