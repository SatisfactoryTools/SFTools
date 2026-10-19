import {Injectable, Signal, signal} from '@angular/core';
import {SupportersApiService} from '@src/Model/API/SupportersApiService';
import {AppStorage} from '@src/Model/Storage/AppStorage';

const CACHE_KEY = 'sftools.supporters.names';

/** The last list is kept so the desktop app still thanks supporters offline; with nothing cached, it is empty and the sections hide. */
@Injectable({providedIn: 'root'})
export class SupporterListService
{

	private readonly namesSignal = signal<string[]>([]);
	public readonly names: Signal<string[]> = this.namesSignal.asReadonly();

	private loaded = false;

	public constructor(
		private readonly api: SupportersApiService,
		private readonly storage: AppStorage,
	)
	{
		this.namesSignal.set(this.readCache());
	}

	public ensureLoaded(): void
	{
		if (!this.loaded) {
			this.reload();
		}
	}

	public reload(): void
	{
		this.loaded = true;
		this.api.getList().subscribe({
			next: response => {
				if (!Array.isArray(response?.supporters)) {
					this.loaded = false;
					return;
				}
				const names = response.supporters.map(entry => entry.name.trim()).filter(name => name !== '');
				this.namesSignal.set(names);
				this.storage.setItem(CACHE_KEY, JSON.stringify(names));
			},
			// Offline or an older backend: keep the cached list. A later visit tries again.
			error: () => {
				this.loaded = false;
			},
		});
	}

	private readCache(): string[]
	{
		try {
			const parsed: unknown = JSON.parse(this.storage.getItem(CACHE_KEY) ?? '[]');
			return Array.isArray(parsed) ? parsed.filter((name): name is string => typeof name === 'string' && name.trim() !== '') : [];
		} catch {
			return [];
		}
	}

}
