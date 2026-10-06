export interface FolderSchema
{
	readonly id: string;
	readonly name: string;
	readonly version: string;
	readonly parent: string | null;
	readonly createdAt: string;
	readonly data: string;
	readonly revision: number;
}
