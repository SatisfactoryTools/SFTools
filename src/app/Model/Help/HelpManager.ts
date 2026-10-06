import {Injectable, computed, signal} from '@angular/core';
import {HelpApiService} from '@src/Model/API/HelpApiService';
import {HelpArticleSummary} from '@src/Model/API/Schema/Help/HelpArticleSummary';
import {HelpManifest} from '@src/Model/API/Schema/Help/HelpManifest';
import {HelpManifestCategory} from '@src/Model/API/Schema/Help/HelpManifestCategory';

@Injectable({providedIn: 'root'})
export class HelpManager
{

	private readonly manifestSignal = signal<HelpManifest | null>(null);
	public readonly manifest = this.manifestSignal.asReadonly();

	/** False until the first load settles, so nothing flashes "no help" meanwhile. */
	private readonly loadedSignal = signal(false);
	public readonly loaded = this.loadedSignal.asReadonly();

	public readonly categories = computed<HelpManifestCategory[]>(() => this.manifestSignal()?.categories ?? []);

	public readonly articles = computed<Record<string, HelpArticleSummary>>(() => this.manifestSignal()?.articles ?? {});

	public readonly hasArticles = computed(() => Object.keys(this.articles()).length > 0);

	public constructor(private readonly api: HelpApiService)
	{
		this.load();
	}

	public summary(slug: string): HelpArticleSummary | null
	{
		return this.articles()[slug] ?? null;
	}

	public articleUrl(slug: string): string | undefined
	{
		const manifest = this.manifestSignal();
		if (manifest === null || !(slug in manifest.articles)) {
			return undefined;
		}
		return this.api.articleUrl(slug, manifest.generatedAt);
	}

	public load(): void
	{
		this.api.loadManifest().subscribe(manifest => {
			this.manifestSignal.set(manifest);
			this.loadedSignal.set(true);
		});
	}

}
