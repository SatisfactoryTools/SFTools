export interface FolderRecalculationProgress
{

	readonly folderId: string;

	readonly done: number;

	readonly total: number;

	readonly currentName: string | null;

}
