import {AppStorage} from '@src/Model/Storage/AppStorage';

export class BrowserAppStorage extends AppStorage
{

	private readonly storage: Storage | null = BrowserAppStorage.openLocalStorage();
	private readonly memory = new Map<string, string>();

	public getItem(key: string): string | null
	{
		return this.storage !== null ? this.storage.getItem(key) : this.memory.get(key) ?? null;
	}

	public setItem(key: string, value: string): void
	{
		if (this.storage !== null) {
			this.storage.setItem(key, value);
		} else {
			this.memory.set(key, value);
		}
	}

	public removeItem(key: string): void
	{
		if (this.storage !== null) {
			this.storage.removeItem(key);
		} else {
			this.memory.delete(key);
		}
	}

	public keys(prefix: string): string[]
	{
		if (this.storage === null) {
			return [...this.memory.keys()].filter(key => key.startsWith(prefix));
		}
		const keys: string[] = [];
		for (let i = 0; i < this.storage.length; i++) {
			const key = this.storage.key(i);
			if (key !== null && key.startsWith(prefix)) {
				keys.push(key);
			}
		}
		return keys;
	}

	// Blocked site data (Firefox's cookie setting, some privacy modes) makes every localStorage access throw a SecurityError; the app then keeps its state for this page load only.
	private static openLocalStorage(): Storage | null
	{
		try {
			const storage = window.localStorage;
			storage.getItem('sftools.storageProbe');
			return storage;
		} catch {
			return null;
		}
	}

}
