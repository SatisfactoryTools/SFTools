import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {PowerSign} from '@src/Components/Common/PowerSign';
import {PowerDraw} from '@src/Model/Planner/PowerDraw';
import {RateFormatter} from '@src/Model/RateFormatter';

/**
 * THE way a power figure renders in the planner: the average as the number
 * and, when the figure oscillates (variable-draw machines), the min–max band
 * on its own small muted line underneath. The band never sits beside the
 * number, so it cannot widen a table column or a stacked mobile row.
 */
@Component({
	selector: 'power-draw',
	templateUrl: './PowerDrawComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	styles: [`
		:host {
			display: inline-block;
			vertical-align: top;
			text-align: inherit;
		}
		.range {
			display: block;
			line-height: 1.2;
			white-space: nowrap;
		}
	`],
})
export class PowerDrawComponent
{

	@Input({required: true}) public draw: PowerDraw = PowerDraw.ZERO;
	@Input() public sign: PowerSign = 'plain';

	public constructor(private readonly rateFormatter: RateFormatter)
	{
	}

	public get valueText(): string
	{
		const average = this.draw.average;
		if (this.rateFormatter.isZero(average)) {
			return this.rateFormatter.power(0);
		}
		return `${this.prefix(average)}${this.rateFormatter.power(Math.abs(average))}`;
	}

	/**
	 * The band as magnitudes in the number's orientation - the number already
	 * carries the sign, and a signed range ("-3–7 GW") would read as crossing zero.
	 */
	public get rangeText(): string
	{
		const band = this.sign !== 'plain' && this.draw.average < 0 ? this.draw.negate() : this.draw;
		return this.rateFormatter.powerRange(band.min, band.max);
	}

	private prefix(average: number): string
	{
		switch (this.sign) {
			case 'balance':
				return average < 0 ? '+' : '';
			case 'net':
				return average < 0 ? '-' : '+';
			default:
				return '';
		}
	}

}
