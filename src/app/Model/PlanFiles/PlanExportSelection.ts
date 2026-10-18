export interface PlanExportSelection
{
	/** A selected plan always takes its whole subplan tree along: its graph points at them. */
	readonly planIds: ReadonlySet<string>;
	/** Only meaningful for empty folders; other folders are exported when anything inside them is. */
	readonly folderIds: ReadonlySet<string>;
}
