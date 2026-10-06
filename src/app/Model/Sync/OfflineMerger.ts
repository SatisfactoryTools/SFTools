import {OfflineMergeResult} from '@src/Model/Sync/OfflineMergeResult';

export interface OfflineMerger<T>
{
	merge(base: T | null, local: T, remote: T | null): OfflineMergeResult<T>;
}
