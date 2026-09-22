import {Injectable, computed, signal} from '@angular/core';
import {SearchNavigator} from '@src/Model/Search/SearchNavigator';
import {SearchResult} from '@src/Model/Search/SearchResult';
import {SearchService} from '@src/Model/Search/SearchService';

/**
 * The app-wide search as a search box sees it: the typed query, the results
 * it produced and the keyboard cursor walking them. Provided per search box
 * (the navbar one and the fullscreen one on phones each get their own), so
 * both behave the same without sharing a query.
 */
@Injectable()
export class SearchBoxState
{

	private readonly querySignal = signal('');
	public readonly query = this.querySignal.asReadonly();

	/** Index into `results` of the row the keyboard is on. */
	private readonly activeIndexSignal = signal(0);
	public readonly activeIndex = this.activeIndexSignal.asReadonly();

	public readonly groups = computed(() => this.searchService.search(this.querySignal()));

	public readonly results = computed<SearchResult[]>(() => this.groups().flatMap(group => group.results));

	/** The row the keyboard is on; null while there is nothing to walk. */
	public readonly activeResult = computed<SearchResult | null>(
		() => this.results()[this.activeIndexSignal()] ?? null,
	);

	/** True until the query is long enough to search with. */
	public readonly tooShort = computed(
		() => this.querySignal().trim().length < SearchService.MIN_QUERY_LENGTH,
	);

	public constructor(
		private readonly searchService: SearchService,
		private readonly navigator: SearchNavigator,
	)
	{
	}

	/** Typing narrows the list, so the cursor goes back to the best match. */
	public setQuery(query: string): void
	{
		this.querySignal.set(query);
		this.activeIndexSignal.set(0);
	}

	public clear(): void
	{
		this.setQuery('');
	}

	public moveActive(delta: number): void
	{
		const last = Math.max(0, this.results().length - 1);
		this.activeIndexSignal.update(index => Math.min(Math.max(index + delta, 0), last));
	}

	/** Pointer and keyboard agree on one cursor: hovering a row moves it there. */
	public setActiveResult(result: SearchResult): void
	{
		const index = this.results().indexOf(result);
		if (index >= 0) {
			this.activeIndexSignal.set(index);
		}
	}

	/** Opens the row the keyboard is on; false when there is none. */
	public openActive(): boolean
	{
		const result = this.activeResult();
		if (result === null) {
			return false;
		}
		this.open(result);
		return true;
	}

	/** Opens a result and empties the box behind it. */
	public open(result: SearchResult): void
	{
		this.clear();
		this.navigator.open(result);
	}

}
