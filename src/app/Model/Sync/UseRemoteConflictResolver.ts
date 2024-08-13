import {Observable, of} from 'rxjs';
import {ConflictResolution} from '@src/Model/Sync/ConflictResolution';
import {ConflictResolver} from '@src/Model/Sync/ConflictResolver';

export class UseRemoteConflictResolver<T> implements ConflictResolver<T>
{

	public resolve({remote}: ConflictResolution<T>): Observable<T>
	{
		return of(remote);
	}

}
