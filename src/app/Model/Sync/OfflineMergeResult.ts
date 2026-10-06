export interface OfflineMergeResult<T>
{

	readonly data: T;

	readonly changed: boolean;

	readonly conflicts: number;

}
