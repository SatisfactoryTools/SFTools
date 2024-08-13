import {Observable, of} from 'rxjs';
import {ConflictResolution} from '@src/Model/Sync/ConflictResolution';
import {ConflictResolver} from '@src/Model/Sync/ConflictResolver';

export class UseLocalConflictResolver<T> implements ConflictResolver<T>
{

	public resolve({local}: ConflictResolution<T>): Observable<T>
	{
		return of(local);
	}

}
