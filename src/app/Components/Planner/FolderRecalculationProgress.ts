/** State of a running folder-wide recalculation. */
export interface FolderRecalculationProgress
{

	readonly folderId: string;

	/** Plans finished so far (solved, failed or skipped). */
	readonly done: number;

	readonly total: number;

	/** Display name of the plan being solved right now. */
	readonly currentName: string | null;

}
