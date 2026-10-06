import {Injectable, computed, signal} from '@angular/core';
import {SearchNavigator} from '@src/Model/Search/SearchNavigator';
import {SearchResult} from '@src/Model/Search/SearchResult';
import {SearchService} from '@src/Model/Search/SearchService';

@Injectable()
export class SearchBoxState
{

	private readonly querySignal = signal('');
	public readonly query = this.querySignal.asReadonly();

	private readonly activeIndexSignal = signal(0);
	public readonly activeIndex = this.activeIndexSignal.asReadonly();

	public readonly groups = computed(() => this.searchService.search(this.querySignal()));

	public readonly results = computed<SearchResult[]>(() => this.groups().flatMap(group => group.results));

	public readonly activeResult = computed<SearchResult | null>(
		() => this.results()[this.activeIndexSignal()] ?? null,
	);

	public readonly tooShort = computed(
		() => this.querySignal().trim().length < SearchService.MIN_QUERY_LENGTH,
	);

	public constructor(
		private readonly searchService: SearchService,
		private readonly navigator: SearchNavigator,
	)
	{
	}

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

	public setActiveResult(result: SearchResult): void
	{
		const index = this.results().indexOf(result);
		if (index >= 0) {
			this.activeIndexSignal.set(index);
		}
	}

	public openActive(): boolean
	{
		const result = this.activeResult();
		if (result === null) {
			return false;
		}
		this.open(result);
		return true;
	}

	public open(result: SearchResult): void
	{
		this.clear();
		this.navigator.open(result);
	}

}
