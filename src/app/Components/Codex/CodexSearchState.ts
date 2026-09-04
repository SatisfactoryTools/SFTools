import {Injectable, computed, effect, signal} from '@angular/core';
import {CodexNavigation} from '@src/Components/Codex/CodexNavigation';
import {SearchResult} from '@src/Model/Search/SearchResult';
import {SearchResultType} from '@src/Model/Search/SearchResultType';
import {SearchService} from '@src/Model/Search/SearchService';

const CODEX_TYPES: SearchResultType[] = ['item', 'recipe', 'building', 'schematic'];
// Searching everything shows a handful per section; a single section is the
// whole answer, so it may list far more.
const RESULTS_PER_GROUP_ALL = 8;
const RESULTS_PER_GROUP_SECTION = 40;

/**
 * The in-panel codex search: query, scope and keyboard cursor shared by the
 * search box (input) and the result list (output). Scoped to the current
 * codex section when there is one - browsing items searches only items -
 * and to the whole codex (never plans or folders) from the section menu.
 * Provided per codex host, so each panel instance has its own query.
 */
@Injectable()
export class CodexSearchState
{

	private readonly querySignal = signal('');
	public readonly query = this.querySignal.asReadonly();

	private readonly activeIndexSignal = signal(0);
	public readonly activeIndex = this.activeIndexSignal.asReadonly();

	/** The searched types - one section's type while in that section, else all four. */
	public readonly types = computed<SearchResultType[]>(() => {
		const type = this.sectionType(this.navigation.path().split('/')[0]);
		return type !== null ? [type] : CODEX_TYPES;
	});

	/** Human label of the scope for the placeholder: "items", "recipes", … or "codex". */
	public readonly scopeLabel = computed<string>(() => {
		const section = this.navigation.path().split('/')[0];
		return this.sectionType(section) !== null ? section : 'codex';
	});

	public readonly groups = computed(() => {
		const types = this.types();
		const limit = types.length === 1 ? RESULTS_PER_GROUP_SECTION : RESULTS_PER_GROUP_ALL;
		return this.searchService.search(this.querySignal(), types, limit);
	});

	public readonly flatResults = computed<SearchResult[]>(() => this.groups().flatMap(group => group.results));

	/** True while the search result list replaces the browsed content. */
	public readonly active = computed<boolean>(() => this.querySignal().trim() !== '');

	public constructor(
		private readonly searchService: SearchService,
		private readonly navigation: CodexNavigation,
	)
	{
		// Any codex navigation (a clicked result, a link, the back button)
		// ends the search and shows the target.
		effect(() => {
			this.navigation.path();
			this.querySignal.set('');
		});
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
		const last = Math.max(0, this.flatResults().length - 1);
		this.activeIndexSignal.update(index => Math.min(Math.max(index + delta, 0), last));
	}

	public openActive(): void
	{
		const result = this.flatResults()[this.activeIndexSignal()];
		if (result) {
			void this.navigation.navigate(this.pathOf(result));
		}
	}

	public pathOf(result: SearchResult): string
	{
		return `${this.sectionOf(result.type)}/${result.id}`;
	}

	private sectionOf(type: SearchResultType): string
	{
		switch (type) {
			case 'item': return 'items';
			case 'recipe': return 'recipes';
			case 'building': return 'buildings';
			default: return 'schematics';
		}
	}

	private sectionType(section: string): SearchResultType | null
	{
		switch (section) {
			case 'items': return 'item';
			case 'recipes': return 'recipe';
			case 'buildings': return 'building';
			case 'schematics': return 'schematic';
			default: return null;
		}
	}

}
