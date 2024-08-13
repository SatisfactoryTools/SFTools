import {Observable} from 'rxjs';

export interface DataBackend<T>
{
	load(): Observable<T | null>;
	save(data: T): Observable<void>;
	clear(): Observable<void>;
}
