/** One entry of GET /v1/versions/plan-counts. */
export interface VersionPlanCount
{
	/** Top-level plans only - folders and subplans are not counted. */
	readonly planCount: number;
	/** ISO 8601; newest change across all plans of the version, subplans included. */
	readonly lastPlanUpdatedAt: string;
}
