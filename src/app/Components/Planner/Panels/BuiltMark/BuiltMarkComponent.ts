import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faCircleCheck, faCircleHalfStroke} from '@fortawesome/free-solid-svg-icons';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {RateFormatter} from '@src/Model/RateFormatter';

@Component({
	selector: 'built-mark',
	changeDetection: ChangeDetectionStrategy.Eager,
	templateUrl: './BuiltMarkComponent.html',
	imports: [FaIconComponent, AppTooltipDirective],
	host: {class: 'd-inline-flex align-items-center'},
})
export class BuiltMarkComponent
{

	public readonly faCircleCheck = faCircleCheck;
	public readonly faCircleHalfStroke = faCircleHalfStroke;

	@Input({required: true}) public built = 0;

	@Input({required: true}) public total = 0;

	/** Flow amounts are not machine counts, so they read as a share instead of "N of M". */
	@Input() public share = false;

	public constructor(
		private readonly rateFormatter: RateFormatter,
	)
	{
	}

	public get state(): 'none' | 'partial' | 'full'
	{
		if (this.total <= 0 || this.rateFormatter.isZero(this.built)) {
			return 'none';
		}
		return this.rateFormatter.isZero(this.total - this.built) ? 'full' : 'partial';
	}

	public get label(): string
	{
		if (this.state === 'full') {
			return 'Built - marked as done on the graph';
		}
		return this.share
			? `${this.rateFormatter.percent(this.built / this.total)} built`
			: `${this.rateFormatter.amount(this.built)} of ${this.rateFormatter.amount(this.total)} built`;
	}

}
