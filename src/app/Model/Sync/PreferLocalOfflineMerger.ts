import {OfflineMergeResult} from '@src/Model/Sync/OfflineMergeResult';
import {OfflineMerger} from '@src/Model/Sync/OfflineMerger';

export class PreferLocalOfflineMerger<T> implements OfflineMerger<T>
{

	public merge(base: T | null, local: T, remote: T | null): OfflineMergeResult<T>
	{
		const localJson = JSON.stringify(local);
		if (localJson === JSON.stringify(base) || localJson === JSON.stringify(remote)) {
			return {data: remote ?? local, changed: remote === null, conflicts: 0};
		}
		return {data: local, changed: true, conflicts: 0};
	}

}
