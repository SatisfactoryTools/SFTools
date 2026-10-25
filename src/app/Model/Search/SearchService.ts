import {Injectable} from '@angular/core';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {HelpArticleSummary} from '@src/Model/API/Schema/Help/HelpArticleSummary';
import {Version} from '@src/Model/API/Schema/Version';
import {HelpManager} from '@src/Model/Help/HelpManager';
import {HelpNavigation} from '@src/Components/Help/HelpNavigation';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {SearchResult} from '@src/Model/Search/SearchResult';
import {SearchResultGroup} from '@src/Model/Search/SearchResultGroup';
import {SearchResultType} from '@src/Model/Search/SearchResultType';
import {TextMatcher} from '@src/Model/Search/TextMatcher';

const MAX_RESULTS_PER_GROUP = 5;
const MAX_FLAT_RESULTS = 12;
const MAX_FLAT_RESULTS_PER_TYPE = 3;
const ALL_TYPES: SearchResultType[] = ['plan', 'folder', 'item', 'recipe', 'building', 'schematic', 'version', 'article'];
const GROUP_LABELS: Record<SearchResultType, string> = {
	plan: 'Plans',
	folder: 'Folders',
	item: 'Items',
	recipe: 'Recipes',
	building: 'Buildings',
	schematic: 'Schematics',
	version: 'Versions',
	article: 'Help',
};

@Injectable({providedIn: 'root'})
export class SearchService
{

	public static readonly MIN_QUERY_LENGTH = 2;

	public constructor(
		private readonly versionManager: VersionManager,
		private readonly planManager: PlanManager,
		private readonly help: HelpManager,
		private readonly matcher: TextMatcher,
	)
	{
	}

	public search(
		query: string,
		types: SearchResultType[] = ALL_TYPES,
		limitPerGroup: number = MAX_RESULTS_PER_GROUP,
	): SearchResultGroup[]
	{
		const normalized = this.matcher.normalize(query);
		if (normalized.length < SearchService.MIN_QUERY_LENGTH) {
			return [];
		}

		return types
			.map(type => this.group(GROUP_LABELS[type], this.candidates(type, normalized), limitPerGroup))
			.filter(group => group.results.length > 0);
	}

	/** One list for every kind: best match first, ties go to the kind listed first in ALL_TYPES. */
	public searchFlat(
		query: string,
		limit: number = MAX_FLAT_RESULTS,
		limitPerType: number = MAX_FLAT_RESULTS_PER_TYPE,
	): SearchResult[]
	{
		const normalized = this.matcher.normalize(query);
		if (normalized.length < SearchService.MIN_QUERY_LENGTH) {
			return [];
		}

		const ranked = ALL_TYPES
			.flatMap(type => this.candidates(type, normalized))
			.filter((candidate): candidate is SearchResult => candidate !== null)
			.sort((a, b) => b.score - a.score
				|| ALL_TYPES.indexOf(a.type) - ALL_TYPES.indexOf(b.type)
				|| a.name.localeCompare(b.name));

		// Within one kind of match, a crowded kind goes after the first few of every other kind - but never below a weaker kind of match.
		const counts = new Map<string, number>();
		return ranked
			.map((result, index) => {
				const tier = this.matcher.tier(result.score);
				const key = `${tier}:${result.type}`;
				const count = counts.get(key) ?? 0;
				counts.set(key, count + 1);
				return {result, index, tier, overflow: count >= limitPerType ? 1 : 0};
			})
			.sort((a, b) => b.tier - a.tier || a.overflow - b.overflow || a.index - b.index)
			.slice(0, limit)
			.map(entry => entry.result);
	}

	private candidates(type: SearchResultType, query: string): (SearchResult | null)[]
	{
		const data = this.versionManager.activeVersionData();
		switch (type) {
			case 'plan':
				return this.planManager.plans().map(plan => {
					const result = this.result('plan', plan.id, plan.name, [], null, query);
					return result !== null && plan.parentPlanId !== null ? {...result, kindLabel: 'Subplan'} : result;
				});
			case 'folder':
				return this.planManager.folders().map(folder =>
					this.result('folder', folder.id, folder.name, [], null, query));
			case 'item':
				return (data?.items ?? []).map(item =>
					this.result('item', item.className, item.name, [item.icon], item.description, query));
			case 'recipe':
				return (data?.recipes ?? []).filter(recipe => !recipe.inBuildGun).map(recipe =>
					this.result('recipe', recipe.className, recipe.name, recipe.products.map(p => p.item?.icon ?? null), null, query));
			case 'building':
				return (data?.buildings ?? []).map(building =>
					this.result('building', building.className, building.name, [building.icon], building.description, query));
			case 'schematic':
				return (data?.schematics ?? []).map(schematic =>
					this.result('schematic', schematic.className, schematic.name, [schematic.icon], schematic.description, query));
			case 'version':
				return this.versionManager.versions().map(version => this.versionResult(version, query));
			case 'article':
				return Object.entries(this.help.articles()).map(([slug, article]) => this.articleResult(slug, article, query));
		}
	}

	private result(
		type: SearchResultType,
		id: string,
		name: string,
		icons: (string | null)[],
		description: string | null,
		query: string,
	): SearchResult | null
	{
		const match = this.matcher.match(query, name, description);
		return match !== null ? {type, id, name, icons, ...match} : null;
	}

	private versionResult(version: Version, query: string): SearchResult | null
	{
		const result = this.result('version', version.id, version.name, [], null, query);
		if (result === null) {
			return null;
		}
		const detail = version.custom ? 'Custom version' : this.versionManager.gameVersionRange(version);
		return detail !== null ? {...result, snippet: [{text: detail, match: false}]} : result;
	}

	private articleResult(slug: string, article: HelpArticleSummary, query: string): SearchResult | null
	{
		const direct = this.result('article', slug, article.title, [], article.summary, query);
		if (direct !== null) {
			return direct;
		}

		const section = article.sections.find(entry => this.matcher.matches(query, entry.title));
		if (section !== undefined) {
			return {
				type: 'article',
				id: HelpNavigation.pathFor(slug, section.id),
				name: article.title,
				icons: [],
				score: TextMatcher.SCORE_DESCRIPTION,
				nameFragments: [{text: article.title, match: false}],
				snippet: this.matcher.match(query, section.title)?.nameFragments ?? null,
			};
		}

		return article.keywords.some(keyword => this.matcher.matches(query, keyword))
			? {
				type: 'article',
				id: slug,
				name: article.title,
				icons: [],
				score: TextMatcher.SCORE_DESCRIPTION,
				nameFragments: [{text: article.title, match: false}],
				snippet: null,
			}
			: null;
	}

	private group(label: string, candidates: (SearchResult | null)[], limit: number): SearchResultGroup
	{
		const results = candidates
			.filter((candidate): candidate is SearchResult => candidate !== null)
			.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
			.slice(0, limit);
		return {label, results};
	}

}
