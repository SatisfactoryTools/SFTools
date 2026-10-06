import {Injectable} from '@angular/core';
import {ItemForm} from '@src/Model/API/Schema/Data/Parts/ItemForm';
import {Item} from '@src/Model/Data/Entities/Item';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';

@Injectable({providedIn: 'root'})
export class RateFormatter
{

	public constructor(private readonly settings: SettingsManager)
	{
	}

	public rate(amount: number, item: Item | null = null): string
	{
		const unit = this.unit(item);
		return unit.startsWith('/') ? `${this.amount(amount)}${unit}` : `${this.amount(amount)} ${unit}`;
	}

	public unit(item: Item | null = null): string
	{
		if (item !== null && item.form !== ItemForm.Solid) {
			return this.settings.numbers().showFluidUnit ? 'm³/min' : '/min';
		}
		return '/min';
	}

	public amount(amount: number): string
	{
		return this.format(amount, this.settings.numbers().itemAmountPrecision);
	}

	public isZero(amount: number): boolean
	{
		return this.format(Math.abs(amount), this.settings.numbers().itemAmountPrecision) === '0';
	}

	public machineCount(machines: number): string
	{
		return this.format(machines, this.settings.numbers().machineCountPrecision);
	}

	public clock(clockSpeed: number): string
	{
		return this.format(clockSpeed, this.settings.numbers().clockSpeedPrecision);
	}

	public weight(weight: number): string
	{
		return this.format(weight, 4);
	}

	public percent(fraction: number): string
	{
		return `${this.amount(fraction * 100)}%`;
	}

	public duration(seconds: number): string
	{
		if (seconds < 60) {
			return `${this.amount(seconds)} s`;
		}
		const minutes = Math.floor(seconds / 60);
		const rest = seconds % 60;
		return rest > 0 ? `${minutes} min ${this.amount(rest)} s` : `${minutes} min`;
	}

	public power(megawatts: number): string
	{
		const scale = this.powerScale(megawatts);
		return `${this.amount(megawatts / scale.divisor)} ${scale.unit}`;
	}

	/** A band reaching below zero spells the dash out ("-250 to 250 MW") so the minus signs stay readable. */
	public powerRange(min: number, max: number): string
	{
		const scale = this.powerScale(Math.max(Math.abs(min), Math.abs(max)));
		const from = this.amount(min / scale.divisor);
		const to = this.amount(max / scale.divisor);
		return `${from}${min < 0 && !this.isZero(min) ? ' to ' : '–'}${to} ${scale.unit}`;
	}

	private powerScale(megawatts: number): {divisor: number; unit: string}
	{
		if (this.settings.numbers().powerDisplay === 'mw') {
			return {divisor: 1, unit: 'MW'};
		}
		const units = ['MW', 'GW', 'TW', 'PW'];
		let value = Math.abs(megawatts);
		let divisor = 1;
		let unit = 0;
		while (value >= 1000 && unit < units.length - 1) {
			value /= 1000;
			divisor *= 1000;
			unit++;
		}
		return {divisor, unit: units[unit]};
	}

	private format(value: number, digits: number): string
	{
		let text = value.toFixed(Math.max(0, digits));
		// Only with a fractional part - never strip integer zeroes.
		if (text.includes('.')) {
			text = text.replace(/0+$/, '').replace(/\.$/, '');
		}
		if (text === '-0') {
			text = '0';
		}
		return this.settings.numbers().decimalSeparator === 'comma' ? text.replace('.', ',') : text;
	}

}
