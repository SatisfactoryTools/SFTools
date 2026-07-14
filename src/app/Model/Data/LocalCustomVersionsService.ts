import {Injectable} from '@angular/core';

const STORAGE_KEY = 'sftools.customVersions';

/**
 * The anonymous user's custom-version list: just the UUIDs, kept in
 * localStorage. The UUID is the durable part - names and data paths are
 * refreshed from the API. Logged-in users don't use this; their list is
 * linked server-side (and locals are adopted into it on login).
 */
@Injectable({providedIn: 'root'})
export class LocalCustomVersionsService
{

	public list(): string[]
	{
		try {
			const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
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
		localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
	}

}
