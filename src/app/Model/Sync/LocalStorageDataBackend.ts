import {Observable, of} from 'rxjs';
import {AppStorage} from '@src/Model/Storage/AppStorage';
import {DataBackend} from '@src/Model/Sync/DataBackend';

export class LocalStorageDataBackend<T> implements DataBackend<T>
{

	public constructor(
		private readonly storage: AppStorage,
		private readonly key: string,
	)
	{
	}

	public load(): Observable<T | null>
	{
		const raw = this.storage.getItem(this.key);
		if (raw === null) return of(null);
		try {
			return of(JSON.parse(raw) as T);
		} catch {
			return of(null);
		}
	}

	public save(data: T): Observable<void>
	{
		this.storage.setItem(this.key, JSON.stringify(data));
		return of(void 0);
	}

	public clear(): Observable<void>
	{
		this.storage.removeItem(this.key);
		return of(void 0);
	}

}
