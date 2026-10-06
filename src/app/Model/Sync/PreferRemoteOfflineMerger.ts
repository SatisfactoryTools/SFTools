import {OfflineMergeResult} from '@src/Model/Sync/OfflineMergeResult';
import {OfflineMerger} from '@src/Model/Sync/OfflineMerger';

export class PreferRemoteOfflineMerger<T> implements OfflineMerger<T>
{

	public merge(base: T | null, local: T, remote: T | null): OfflineMergeResult<T>
	{
		return {data: remote ?? local, changed: remote === null, conflicts: 0};
	}

}
