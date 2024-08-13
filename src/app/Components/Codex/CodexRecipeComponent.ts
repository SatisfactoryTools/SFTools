import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronRight} from '@fortawesome/free-solid-svg-icons';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {CodexEntityLinkComponent} from '@src/Components/Codex/CodexEntityLinkComponent';
import {CodexItemAmountTileComponent} from '@src/Components/Codex/CodexItemAmountTileComponent';
import {CodexLinkDirective} from '@src/Components/Codex/CodexLinkDirective';
import {ItemAmount} from '@src/Model/Data/Entities/Parts/ItemAmount';
import {Recipe} from '@src/Model/Data/Entities/Recipe';
import {RateFormatter} from '@src/Model/RateFormatter';

/**
 * One full recipe as a table row (host: `<tr codex-recipe>` inside a
 * codex-recipe-list table, so the columns align across recipes): name,
 * "amount × icon" tiles (per-minute rate underneath, item name as tooltip)
 * with ingredients → products, and the machine with cycle time and cycles
 * per minute as its caption - every entity in it cross-linked. A machine
 * recipe that is also handcraftable gets an "also: …" note instead of extra
 * tiles.
 */
@Component({
	selector: 'tr[codex-recipe]',
	templateUrl: './CodexRecipeComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [CodexEntityLinkComponent, CodexItemAmountTileComponent, CodexLinkDirective, FaIconComponent, GameIconComponent],
	// The :not(.btn) qualifiers out-rank the theme's ".table a:not(.btn)"
	// white-underlined-link styling, which would swallow the tiles.
	styles: `
		.io-tile {
			display: inline-flex;
			flex-direction: column;
			align-items: center;
			text-decoration: none;
			color: inherit;
		}
		a.io-tile:not(.btn) {
			text-decoration: none;
			color: inherit;
		}
		a.io-tile:not(.btn):hover .io-amount {
			text-decoration: underline;
		}
	`,
})
export class CodexRecipeComponent
{

	@Input({required: true}) public recipe!: Recipe;
	/** Off on the recipe's own detail page, where the name is the page title. */
	@Input() public showName = true;

	public readonly faChevronRight = faChevronRight;

	public constructor(protected readonly formatter: RateFormatter)
	{
	}

	protected perMinute(entry: ItemAmount): string
	{
		return this.formatter.rate(entry.amount * 60 / this.recipe.time, entry.item);
	}

	protected cyclesPerMinute(recipe: Recipe): string
	{
		return this.formatter.amount(60 / recipe.time);
	}

	/** "Craft Bench", "Equipment Workshop" - empty when not handcraftable. */
	protected handcraftPlaces(recipe: Recipe): string[]
	{
		const places: string[] = [];
		if (recipe.inCraftBench) {
			places.push('Craft Bench');
		}
		if (recipe.inEquipmentWorkshop) {
			places.push('Equipment Workshop');
		}
		return places;
	}

}
