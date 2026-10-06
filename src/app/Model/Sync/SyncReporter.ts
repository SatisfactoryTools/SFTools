import {Observable} from 'rxjs';
import {SyncedStore} from '@src/Model/Sync/SyncedStore';

export interface SyncReporter<T>
{
	readonly synced: Observable<SyncedStore<T>>;
}
