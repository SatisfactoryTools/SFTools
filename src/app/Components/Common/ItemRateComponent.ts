import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {Item} from '@src/Model/Data/Entities/Item';
import {RateFormatter} from '@src/Model/RateFormatter';

/**
 * A per-minute rate for right-aligned table columns: the amount and the unit
 * are separate spans and the unit has a fixed width, so "120/min" and
 * "300 m³/min" stacked in one column keep their digits aligned. A null
 * amount renders "∞" over the same unit width. Formatting comes from
 * RateFormatter - this only lays the parts out.
 */
@Component({
	selector: 'item-rate',
	templateUrl: './ItemRateComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	styles: [`
		:host {
			display: inline-flex;
			align-items: baseline;
			white-space: nowrap;
		}
		.rate-unit {
			display: inline-block;
			min-width: 3.6em;
			text-align: left;
		}
		/* Fluid units carry the space RateFormatter puts before "m³/min". */
		.rate-unit.spaced {
			padding-left: 0.25em;
		}
	`],
})
export class ItemRateComponent
{

	/** Per-minute amount; null shows as unlimited. */
	@Input() public amount: number | null = null;

	@Input() public item: Item | null = null;

	public constructor(private readonly rateFormatter: RateFormatter)
	{
	}

	public get amountText(): string
	{
		return this.amount === null ? '∞' : this.rateFormatter.amount(this.amount);
	}

	public get unit(): string
	{
		return this.rateFormatter.unit(this.item);
	}

	public get spaced(): boolean
	{
		return !this.unit.startsWith('/');
	}

}
