import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {Item} from '@src/Model/Data/Entities/Item';
import {RateFormatter} from '@src/Model/RateFormatter';

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
