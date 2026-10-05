import {Injectable} from '@angular/core';
import {IconUrlService} from '@src/Model/Data/IconUrlService';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {ItemAmount} from '@src/Model/Data/Entities/Parts/ItemAmount';
import {Recipe} from '@src/Model/Data/Entities/Recipe';
import {PageMeta} from '@src/Model/Meta/PageMeta';

/**
 * Page metadata of a fullscreen codex path ('', 'items', 'items/Desc_Cable_C',
 * …) in the active version. The same rules as the API's MetaResolver::codex()
 * and VersionMetaIndex (recipe summaries) - keep them in sync.
 */
@Injectable({providedIn: 'root'})
export class CodexMetaResolver
{

	/** Section → [title, plural noun, singular label for an entity without a description]. */
	private static readonly SECTIONS: Record<string, [string, string, string]> = {
		items: ['Items', 'items', 'Item'],
		recipes: ['Recipes', 'recipes', 'Recipe'],
		buildings: ['Buildings', 'buildings', 'Building'],
		schematics: ['Schematics', 'schematics', 'Schematic'],
	};

	public constructor(
		private readonly versionManager: VersionManager,
		private readonly iconUrls: IconUrlService,
	)
	{
	}

	/** Null when the path names nothing (the route title stays). */
	public resolve(path: string): PageMeta | null
	{
		const version = this.versionManager.activeVersion()?.name ?? '';
		const [sectionKey, className] = path.split('/').filter(segment => segment !== '');
		if (sectionKey === undefined) {
			return {
				title: `Codex (${version})`,
				description: `Searchable codex of items, recipes, buildings and schematics in Satisfactory (${version}).`,
			};
		}

		const section = CodexMetaResolver.SECTIONS[sectionKey];
		if (section === undefined) {
			return null;
		}
		const [sectionTitle, sectionNoun, entityLabel] = section;
		if (className === undefined) {
			return {title: `${sectionTitle} – Codex (${version})`, description: `All ${sectionNoun} in Satisfactory (${version}).`};
		}

		const data = this.versionManager.activeVersionData();
		if (data === null) {
			return null;
		}
		if (sectionKey === 'recipes') {
			const recipe = data.searchRecipeByClassName(className);
			if (!recipe) {
				return null;
			}
			return {
				title: `${recipe.name} (recipe)`,
				description: (recipe.alternate ? 'Alternate recipe: ' : '') + this.recipeSummary(recipe),
				image: this.iconUrls.url(recipe.products[0]?.item?.icon, 256),
			};
		}

		const entity = sectionKey === 'items'
			? data.searchItemByClassName(className)
			: sectionKey === 'buildings' ? data.searchBuildingByClassName(className) : data.searchSchematicByClassName(className);
		if (!entity) {
			return null;
		}
		return {
			title: entity.name,
			description: entity.description.trim() !== '' ? entity.description : `${entityLabel} in Satisfactory (${version}).`,
			image: this.iconUrls.url(entity.icon, 256),
		};
	}

	/** "2× Wire → 1× Cable in Constructor, 2 s" - per-cycle amounts, as the codex recipe row shows them. */
	private recipeSummary(recipe: Recipe): string
	{
		let summary = `${this.amounts(recipe.ingredients)} → ${this.amounts(recipe.products)}`;
		const place = recipe.producedIn[0]?.name
			?? (recipe.inCraftBench ? 'Craft Bench' : recipe.inEquipmentWorkshop ? 'Equipment Workshop' : null);
		if (place) {
			summary += ` in ${place}`;
		}
		return `${summary}, ${this.duration(recipe.time)}`;
	}

	private amounts(amounts: ItemAmount[]): string
	{
		const parts = amounts.filter(entry => entry.item).map(entry => `${this.number(entry.amount)}× ${entry.item.name}`);
		return parts.length > 0 ? parts.join(' + ') : 'nothing';
	}

	/** RateFormatter.duration() without the user's precision setting, so it matches the API. */
	private duration(seconds: number): string
	{
		if (seconds < 60) {
			return `${this.number(seconds)} s`;
		}
		const minutes = Math.floor(seconds / 60);
		const rest = seconds - minutes * 60;
		return rest > 0 ? `${minutes} min ${this.number(rest)} s` : `${minutes} min`;
	}

	/** Up to 4 decimals, trailing zeroes stripped. */
	private number(value: number): string
	{
		const formatted = value.toFixed(4).replace(/\.?0+$/, '');
		return formatted === '-0' ? '0' : formatted;
	}

}
