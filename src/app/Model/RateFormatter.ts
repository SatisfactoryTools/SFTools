import {Injectable} from '@angular/core';
import {ItemForm} from '@src/Model/API/Schema/Data/Parts/ItemForm';
import {Item} from '@src/Model/Data/Entities/Item';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';

/**
 * THE central place for rendering numbers and units anywhere in the UI -
 * per-minute rates ("120/min" for solids, "120 m³/min" for fluids), plain
 * amounts, power ("MW"/"GW"/"TW"), clock speeds and percentages. All
 * user-configurable number formatting (precision, decimal separator, power
 * units, fluid units) is applied here, so no component should format numbers
 * or pick units on its own.
 */
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

	/** Item amount at the configured precision, trailing zeroes stripped ("2.5", never "2.50" or "-0"). */
	public amount(amount: number): string
	{
		return this.format(amount, this.settings.numbers().itemAmountPrecision);
	}

	/** Whether the value displays as zero at the current precision (e.g. ±0.001). */
	public isZero(amount: number): boolean
	{
		return this.format(Math.abs(amount), this.settings.numbers().itemAmountPrecision) === '0';
	}

	/** Fractional machine count at the configured precision; callers add the "×". */
	public machineCount(machines: number): string
	{
		return this.format(machines, this.settings.numbers().machineCountPrecision);
	}

	/** Clock speed value in percent at the configured precision; callers add the % sign. */
	public clock(clockSpeed: number): string
	{
		return this.format(clockSpeed, this.settings.numbers().clockSpeedPrecision);
	}

	/** A 0–1 fraction as a percentage ("87.5%"). */
	public percent(fraction: number): string
	{
		return `${this.amount(fraction * 100)}%`;
	}

	/** A duration in seconds as "45 s", "5 min" or "2 min 30 s". */
	public duration(seconds: number): string
	{
		if (seconds < 60) {
			return `${this.amount(seconds)} s`;
		}
		const minutes = Math.floor(seconds / 60);
		const rest = seconds % 60;
		return rest > 0 ? `${minutes} min ${this.amount(rest)} s` : `${minutes} min`;
	}

	/** Formats a power value given in MW, scaling the unit up unless MW-only is configured. */
	public power(megawatts: number): string
	{
		if (this.settings.numbers().powerDisplay === 'mw') {
			return `${this.amount(megawatts)} MW`;
		}
		const units = ['MW', 'GW', 'TW', 'PW'];
		let value = megawatts;
		let unit = 0;
		while (Math.abs(value) >= 1000 && unit < units.length - 1) {
			value /= 1000;
			unit++;
		}
		return `${this.amount(value)} ${units[unit]}`;
	}

	/** Rounds to `digits` decimals, strips trailing zeroes, then applies the decimal separator. */
	private format(value: number, digits: number): string
	{
		let text = value.toFixed(Math.max(0, digits));
		// Strip trailing fractional zeroes (and a bare decimal point), but only
		// when there is a fractional part - never touch integer digits.
		if (text.includes('.')) {
			text = text.replace(/0+$/, '').replace(/\.$/, '');
		}
		if (text === '-0') {
			text = '0';
		}
		return this.settings.numbers().decimalSeparator === 'comma' ? text.replace('.', ',') : text;
	}

}
