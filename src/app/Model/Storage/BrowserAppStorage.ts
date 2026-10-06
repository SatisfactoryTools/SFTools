import {AppStorage} from '@src/Model/Storage/AppStorage';

export class BrowserAppStorage extends AppStorage
{

	public getItem(key: string): string | null
	{
		return localStorage.getItem(key);
	}

	public setItem(key: string, value: string): void
	{
		localStorage.setItem(key, value);
	}

	public removeItem(key: string): void
	{
		localStorage.removeItem(key);
	}

	public keys(prefix: string): string[]
	{
		const keys: string[] = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key !== null && key.startsWith(prefix)) {
				keys.push(key);
			}
		}
		return keys;
	}

}
