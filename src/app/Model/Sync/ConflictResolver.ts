import {Observable} from 'rxjs';
import {ConflictResolution} from '@src/Model/Sync/ConflictResolution';

export interface ConflictResolver<T>
{
	resolve(conflict: ConflictResolution<T>): Observable<T>;
}
