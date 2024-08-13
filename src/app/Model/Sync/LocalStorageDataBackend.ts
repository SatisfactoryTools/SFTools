import {Observable, of} from 'rxjs';
import {DataBackend} from '@src/Model/Sync/DataBackend';

export class LocalStorageDataBackend<T> implements DataBackend<T>
{

	public constructor(private readonly key: string)
	{
	}

	public load(): Observable<T | null>
	{
		const raw = localStorage.getItem(this.key);
		if (raw === null) return of(null);
		try {
			return of(JSON.parse(raw) as T);
		} catch {
			return of(null);
		}
	}

	public save(data: T): Observable<void>
	{
		localStorage.setItem(this.key, JSON.stringify(data));
		return of(void 0);
	}

	public clear(): Observable<void>
	{
		localStorage.removeItem(this.key);
		return of(void 0);
	}

}
