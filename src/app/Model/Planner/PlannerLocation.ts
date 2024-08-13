/**
 * Where the planner was last open: the version URL segment and the plan that
 * was active there (null when no plan was selected).
 */
export interface PlannerLocation
{
	versionSlug: string;
	planId: string | null;
}
