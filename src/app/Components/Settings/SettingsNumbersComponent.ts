import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NumberSettings} from '@src/Model/Settings/NumberSettings';
import {DecimalSeparator} from '@src/Model/Settings/DecimalSeparator';
import {PowerDisplay} from '@src/Model/Settings/PowerDisplay';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';
import {RateFormatter} from '@src/Model/RateFormatter';

/** "Numbers" settings section - how numbers and units are rendered everywhere. */
@Component({
	selector: 'settings-numbers',
	templateUrl: './SettingsNumbersComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule],
})
export class SettingsNumbersComponent
{

	public constructor(
		private readonly settings: SettingsManager,
		public readonly rateFormatter: RateFormatter,
	)
	{
	}

	public get numbers(): NumberSettings
	{
		return this.settings.numbers();
	}

	public setDecimalSeparator(value: DecimalSeparator): void
	{
		this.settings.updateNumbers({decimalSeparator: value});
	}

	public setItemAmountPrecision(value: number): void
	{
		this.settings.updateNumbers({itemAmountPrecision: this.clamp(value, 0, 6)});
	}

	public setClockSpeedPrecision(value: number): void
	{
		this.settings.updateNumbers({clockSpeedPrecision: this.clamp(value, 0, 4)});
	}

	public setMachineCountPrecision(value: number): void
	{
		this.settings.updateNumbers({machineCountPrecision: this.clamp(value, 0, 6)});
	}

	public setPowerDisplay(value: PowerDisplay): void
	{
		this.settings.updateNumbers({powerDisplay: value});
	}

	public setShowFluidUnit(value: boolean): void
	{
		this.settings.updateNumbers({showFluidUnit: value});
	}

	/** Guards against NaN (empty field) and keeps precision within sane bounds. */
	private clamp(value: number, min: number, max: number): number
	{
		if (!Number.isFinite(value)) {
			return min;
		}
		return Math.min(max, Math.max(min, Math.round(value)));
	}

}
