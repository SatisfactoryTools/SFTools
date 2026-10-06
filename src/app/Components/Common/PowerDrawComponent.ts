import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {PowerSign} from '@src/Components/Common/PowerSign';
import {PowerDraw} from '@src/Model/Planner/PowerDraw';
import {RateFormatter} from '@src/Model/RateFormatter';

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

	/** Magnitudes only: the number carries the sign, and a signed range ("-3–7 GW") would read as crossing zero. */
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
