import {Injectable} from '@angular/core';
import {AppStorage} from '@src/Model/Storage/AppStorage';

const STORAGE_KEY = 'sftools.customVersions';

@Injectable({providedIn: 'root'})
export class LocalCustomVersionsService
{

	public constructor(private readonly storage: AppStorage)
	{
	}

	public list(): string[]
	{
		try {
			const parsed: unknown = JSON.parse(this.storage.getItem(STORAGE_KEY) ?? '[]');
			return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
		} catch {
			return [];
		}
	}

	public add(id: string): void
	{
		const ids = this.list();
		if (!ids.includes(id)) {
			this.store([...ids, id]);
		}
	}

	public remove(id: string): void
	{
		this.store(this.list().filter(candidate => candidate !== id));
	}

	private store(ids: string[]): void
	{
		this.storage.setItem(STORAGE_KEY, JSON.stringify(ids));
	}

}
