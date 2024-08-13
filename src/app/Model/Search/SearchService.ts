import {Injectable} from '@angular/core';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {SearchFragment} from '@src/Model/Search/SearchFragment';
import {SearchMatch} from '@src/Model/Search/SearchMatch';
import {SearchResult} from '@src/Model/Search/SearchResult';
import {SearchResultGroup} from '@src/Model/Search/SearchResultGroup';
import {SearchResultType} from '@src/Model/Search/SearchResultType';

const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS_PER_GROUP = 5;
// Characters of description context shown before/after a matched part.
const SNIPPET_CONTEXT = 36;

// Match quality - an exact name always beats a prefix, a prefix beats a
// substring, initials ("hmf" → Heavy Modular Frame) rank just below any
// direct name hit, and a description hit ranks below everything.
const SCORE_NAME_EXACT = 100;
const SCORE_NAME_PREFIX = 80;
const SCORE_NAME_SUBSTRING = 60;
const SCORE_NAME_INITIALS = 50;
const SCORE_DESCRIPTION = 30;

/**
 * Searches everything reachable in the current version: the codex (items,
 * recipes, buildings, schematics - by name and description) and the user's
 * plans and folders (by name). Results come back in fixed groups (codex
 * types first, then plans, then folders), each sorted by match quality.
 */
@Injectable({providedIn: 'root'})
export class SearchService
{

	public constructor(
		private readonly versionManager: VersionManager,
		private readonly planManager: PlanManager,
	)
	{
	}

	public search(query: string): SearchResultGroup[]
	{
		const normalized = query.trim().toLowerCase();
		if (normalized.length < MIN_QUERY_LENGTH) {
			return [];
		}

		const groups: SearchResultGroup[] = [];
		const data = this.versionManager.activeVersionData();
		if (data !== null) {
			groups.push(this.group('Items', data.items.map(item =>
				this.result('item', item.className, item.name, [item.icon], item.description, normalized))));
			groups.push(this.group('Recipes', data.recipes.filter(recipe => !recipe.inBuildGun).map(recipe =>
				this.result('recipe', recipe.className, recipe.name, recipe.products.map(p => p.item?.icon ?? null), null, normalized))));
			groups.push(this.group('Buildings', data.buildings.map(building =>
				this.result('building', building.className, building.name, [building.icon], building.description, normalized))));
			groups.push(this.group('Schematics', data.schematics.map(schematic =>
				this.result('schematic', schematic.className, schematic.name, [schematic.icon], schematic.description, normalized))));
		}
		groups.push(this.group('Plans', this.planManager.plans().map(plan =>
			this.result('plan', plan.id, plan.name, [], null, normalized))));
		groups.push(this.group('Folders', this.planManager.folders().map(folder =>
			this.result('folder', folder.id, folder.name, [], null, normalized))));

		return groups.filter(group => group.results.length > 0);
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
		const match = this.match(query, name, description);
		return match !== null ? {type, id, name, icons, ...match} : null;
	}

	private group(label: string, candidates: (SearchResult | null)[]): SearchResultGroup
	{
		const results = candidates
			.filter((candidate): candidate is SearchResult => candidate !== null)
			.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
			.slice(0, MAX_RESULTS_PER_GROUP);
		return {label, results};
	}

	private match(query: string, name: string, description: string | null): SearchMatch | null
	{
		const normalizedName = name.toLowerCase();
		if (normalizedName === query) {
			return {score: SCORE_NAME_EXACT, nameFragments: this.highlight(name, query), snippet: null};
		}
		if (normalizedName.startsWith(query)) {
			return {score: SCORE_NAME_PREFIX, nameFragments: this.highlight(name, query), snippet: null};
		}
		if (normalizedName.includes(query)) {
			return {score: SCORE_NAME_SUBSTRING, nameFragments: this.highlight(name, query), snippet: null};
		}
		const initialPositions = this.matchInitials(query, name);
		if (initialPositions !== null) {
			return {score: SCORE_NAME_INITIALS, nameFragments: this.highlightPositions(name, initialPositions), snippet: null};
		}
		if (description !== null) {
			const index = description.toLowerCase().indexOf(query);
			if (index >= 0) {
				return {
					score: SCORE_DESCRIPTION,
					nameFragments: [{text: name, match: false}],
					snippet: this.snippet(description, index, query.length),
				};
			}
		}
		return null;
	}

	/**
	 * Matches the query against the name's word initials, so usual shortcuts
	 * work: "hmf" → Heavy Modular Frame, "cg" → Coal-Powered Generator. The
	 * first letter must match the first word; later letters may skip words
	 * (the "P" in Coal-Powered). Names, not descriptions - and only
	 * multi-word names, where initials are a meaningful shorthand. Returns
	 * the string positions of the matched initials (for highlighting), or
	 * null when there is no match.
	 */
	private matchInitials(query: string, name: string): number[] | null
	{
		const words = [...name.matchAll(/[a-z0-9]+/gi)];
		if (words.length < 2 || query.length > words.length) {
			return null;
		}

		const positions: number[] = [];
		let wordIndex = 0;
		for (const char of query) {
			let found = false;
			while (wordIndex < words.length) {
				const word = words[wordIndex];
				wordIndex++;
				if (word[0][0].toLowerCase() === char) {
					positions.push(word.index!);
					found = true;
					break;
				}
				if (positions.length === 0) {
					return null; // the first letter must match the first word
				}
			}
			if (!found) {
				return null;
			}
		}
		return positions;
	}

	/** Splits text into fragments with every occurrence of the query marked. */
	private highlight(text: string, query: string): SearchFragment[]
	{
		const lower = text.toLowerCase();
		const fragments: SearchFragment[] = [];
		let position = 0;
		for (let index = lower.indexOf(query); index >= 0; index = lower.indexOf(query, position)) {
			if (index > position) {
				fragments.push({text: text.slice(position, index), match: false});
			}
			fragments.push({text: text.slice(index, index + query.length), match: true});
			position = index + query.length;
		}
		if (position < text.length) {
			fragments.push({text: text.slice(position), match: false});
		}
		return fragments;
	}

	/** Splits text into fragments with the single characters at `positions` marked. */
	private highlightPositions(text: string, positions: number[]): SearchFragment[]
	{
		const fragments: SearchFragment[] = [];
		let cursor = 0;
		positions.forEach(position => {
			if (position > cursor) {
				fragments.push({text: text.slice(cursor, position), match: false});
			}
			fragments.push({text: text.slice(position, position + 1), match: true});
			cursor = position + 1;
		});
		if (cursor < text.length) {
			fragments.push({text: text.slice(cursor), match: false});
		}
		return fragments;
	}

	/** Context around a description hit, ellipsized at cut edges, newlines flattened. */
	private snippet(description: string, index: number, length: number): SearchFragment[]
	{
		const start = Math.max(0, index - SNIPPET_CONTEXT);
		const end = Math.min(description.length, index + length + SNIPPET_CONTEXT * 2);

		const fragments: SearchFragment[] = [];
		const prefix = (start > 0 ? '…' : '') + this.flattenWhitespace(description.slice(start, index));
		if (prefix !== '') {
			fragments.push({text: prefix, match: false});
		}
		fragments.push({text: this.flattenWhitespace(description.slice(index, index + length)), match: true});
		const suffix = this.flattenWhitespace(description.slice(index + length, end)) + (end < description.length ? '…' : '');
		if (suffix !== '') {
			fragments.push({text: suffix, match: false});
		}
		return fragments;
	}

	private flattenWhitespace(text: string): string
	{
		return text.replace(/\s+/g, ' ');
	}

}
