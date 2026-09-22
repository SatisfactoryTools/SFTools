import {Injectable, computed, signal} from '@angular/core';
import {HelpApiService} from '@src/Model/API/HelpApiService';
import {HelpArticleSummary} from '@src/Model/API/Schema/Help/HelpArticleSummary';
import {HelpManifest} from '@src/Model/API/Schema/Help/HelpManifest';
import {HelpManifestCategory} from '@src/Model/API/Schema/Help/HelpManifestCategory';

/**
 * The help index, loaded once at startup. Everything that needs to know which
 * articles exist - the browser menu, the search, the question-mark buttons -
 * reads it from here synchronously; article bodies are fetched per article by
 * whoever displays them.
 */
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

	/** Whether there is anything to show at all - the panel and the page hide themselves otherwise. */
	public readonly hasArticles = computed(() => Object.keys(this.articles()).length > 0);

	public constructor(private readonly api: HelpApiService)
	{
		this.load();
	}

	public summary(slug: string): HelpArticleSummary | null
	{
		return this.articles()[slug] ?? null;
	}

	/** Undefined while the manifest is missing or the article is not published. */
	public articleUrl(slug: string): string | undefined
	{
		const manifest = this.manifestSignal();
		if (manifest === null || !(slug in manifest.articles)) {
			return undefined;
		}
		return this.api.articleUrl(slug, manifest.generatedAt);
	}

	/** Re-reads the manifest - after publishing from the editor, say. */
	public load(): void
	{
		this.api.loadManifest().subscribe(manifest => {
			this.manifestSignal.set(manifest);
			this.loadedSignal.set(true);
		});
	}

}
