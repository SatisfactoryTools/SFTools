export interface FolderSchema
{
	readonly id: string;
	readonly name: string;
	readonly version: string;
	readonly parent: string | null;
	readonly createdAt: string;
	/** Opaque JSON payload stored as a string; defaults to "{}". */
	readonly data: string;
	/** Starts at 0, incremented by the server on every successful PUT. */
	readonly revision: number;
}
