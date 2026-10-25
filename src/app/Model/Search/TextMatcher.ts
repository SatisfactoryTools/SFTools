import {Injectable} from '@angular/core';
import {InitialsMatch} from '@src/Model/Search/InitialsMatch';
import {SearchFragment} from '@src/Model/Search/SearchFragment';
import {SearchMatch} from '@src/Model/Search/SearchMatch';

const SNIPPET_CONTEXT = 36;
const MIN_INITIALS_LENGTH = 2;

@Injectable({providedIn: 'root'})
export class TextMatcher
{

	public static readonly SCORE_NAME_EXACT = 100;
	public static readonly SCORE_NAME_PREFIX = 80;
	public static readonly SCORE_NAME_SUBSTRING = 60;
	public static readonly SCORE_NAME_INITIALS = 50;
	public static readonly SCORE_NAME_INITIALS_MIN = 35;
	public static readonly SCORE_INITIALS_SKIPPED_WORD = 3;
	public static readonly SCORE_DESCRIPTION = 30;
	public static readonly SCORE_WORD_START = 12;
	/** Scaled by how much of the name the query covers, so closer fits win ties; stays below the gap between kinds of match. */
	public static readonly SCORE_COVERAGE = 5;

	public normalize(query: string): string
	{
		return query.trim().toLowerCase();
	}

	/** The description is only searched as plain text: initials across a long text would match almost anything. */
	public match(query: string, name: string, description: string | null = null): SearchMatch | null
	{
		const normalized = this.normalize(query);
		if (normalized === '') {
			return {score: TextMatcher.SCORE_NAME_EXACT, nameFragments: [{text: name, match: false}], snippet: null};
		}

		const normalizedName = name.toLowerCase();
		if (normalizedName === normalized) {
			return {score: TextMatcher.SCORE_NAME_EXACT, nameFragments: this.highlight(name, normalized), snippet: null};
		}
		const coverage = TextMatcher.SCORE_COVERAGE * normalized.length / name.length;
		if (normalizedName.startsWith(normalized)) {
			return {score: TextMatcher.SCORE_NAME_PREFIX + coverage, nameFragments: this.highlight(name, normalized), snippet: null};
		}
		const index = normalizedName.indexOf(normalized);
		if (index >= 0) {
			const wordStart = /[a-z0-9]/i.test(name[index - 1]) ? 0 : TextMatcher.SCORE_WORD_START;
			return {score: TextMatcher.SCORE_NAME_SUBSTRING + wordStart + coverage, nameFragments: this.highlight(name, normalized), snippet: null};
		}
		const initials = this.matchInitials(normalized, name);
		if (initials !== null) {
			return {
				score: Math.max(
					TextMatcher.SCORE_NAME_INITIALS_MIN,
					TextMatcher.SCORE_NAME_INITIALS - initials.skippedWords * TextMatcher.SCORE_INITIALS_SKIPPED_WORD,
				) + TextMatcher.SCORE_COVERAGE * initials.positions.length / initials.wordCount,
				nameFragments: this.highlightPositions(name, initials.positions),
				snippet: null,
			};
		}
		if (description !== null) {
			const descriptionIndex = description.toLowerCase().indexOf(normalized);
			if (descriptionIndex >= 0) {
				return {
					score: TextMatcher.SCORE_DESCRIPTION,
					nameFragments: [{text: name, match: false}],
					snippet: this.snippet(description, descriptionIndex, normalized.length),
				};
			}
		}
		return null;
	}

	/** Groups scores into kinds of match (exact, whole word, part of a word, initials, description) - the coverage tie-breakers never cross a tier. */
	public tier(score: number): number
	{
		if (score >= TextMatcher.SCORE_NAME_EXACT) return 4;
		if (score >= TextMatcher.SCORE_NAME_SUBSTRING + TextMatcher.SCORE_WORD_START) return 3;
		if (score >= TextMatcher.SCORE_NAME_SUBSTRING) return 2;
		if (score >= TextMatcher.SCORE_NAME_INITIALS_MIN) return 1;
		return 0;
	}

	public score(query: string, name: string, description: string | null = null): number | null
	{
		return this.match(query, name, description)?.score ?? null;
	}

	public matches(query: string, name: string, description: string | null = null): boolean
	{
		return this.match(query, name, description) !== null;
	}

	/** Keeps the original order - for lists sorted by something other than relevance. */
	public filter<T>(items: readonly T[], query: string, nameOf: (item: T) => string): T[]
	{
		return this.normalize(query) === '' ? [...items] : items.filter(item => this.matches(query, nameOf(item)));
	}

	/** Best matches first; equal scores keep their original order. */
	public rank<T>(items: readonly T[], query: string, nameOf: (item: T) => string): T[]
	{
		return this.normalize(query) === '' ? [...items] : this.rankBy(items, item => this.score(query, nameOf(item)));
	}

	public rankBy<T>(items: readonly T[], scoreOf: (item: T) => number | null): T[]
	{
		return items
			.map((item, index) => ({item, index, score: scoreOf(item)}))
			.filter((entry): entry is {item: T; index: number; score: number} => entry.score !== null)
			.sort((a, b) => b.score - a.score || a.index - b.index)
			.map(entry => entry.item);
	}

	public highlight(text: string, query: string): SearchFragment[]
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

	/** Any word may start the acronym ("hef" finds "Alternate: Heavy Encased Frame"); every word passed over lowers the score. */
	private matchInitials(query: string, name: string): InitialsMatch | null
	{
		const words = [...name.matchAll(/[a-z0-9]+/gi)];
		if (query.length < MIN_INITIALS_LENGTH || query.length > words.length) {
			return null;
		}

		let best: InitialsMatch | null = null;
		for (let start = 0; start <= words.length - query.length; start++) {
			const candidate = this.matchInitialsFrom(query, words, start);
			if (candidate !== null && (best === null || candidate.skippedWords < best.skippedWords)) {
				best = candidate;
			}
		}
		return best;
	}

	private matchInitialsFrom(query: string, words: RegExpExecArray[], start: number): InitialsMatch | null
	{
		const positions: number[] = [];
		let skippedWords = start;
		let wordIndex = start;
		for (const char of query) {
			while (wordIndex < words.length && words[wordIndex][0][0].toLowerCase() !== char) {
				if (positions.length === 0) {
					return null;
				}
				wordIndex++;
				skippedWords++;
			}
			if (wordIndex >= words.length) {
				return null;
			}
			positions.push(words[wordIndex].index);
			wordIndex++;
		}
		return {positions, skippedWords, wordCount: words.length};
	}

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
