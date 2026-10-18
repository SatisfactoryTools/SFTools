/** Everything a folder checkbox acts on, collected once per tree. */
export interface PlanExportFolderScope
{
	readonly topPlanIds: string[];
	readonly allPlanIds: string[];
	readonly emptyFolderIds: string[];
}
