import {DecimalSeparator} from '@src/Model/Settings/DecimalSeparator';
import {PowerDisplay} from '@src/Model/Settings/PowerDisplay';

/** How numbers and their units are rendered throughout the UI. */
export interface NumberSettings
{

	readonly decimalSeparator: DecimalSeparator;

	/** Decimals shown for item amounts and rates (e.g. graph edge labels). */
	readonly itemAmountPrecision: number;

	/** Decimals shown for clock speeds (game caps clocks at four decimals). */
	readonly clockSpeedPrecision: number;

	/** Decimals shown for fractional machine counts (decimal machine display). */
	readonly machineCountPrecision: number;

	readonly powerDisplay: PowerDisplay;

	/** Whether fluid rates carry the "m³" unit ("120 m³/min" vs "120/min"). */
	readonly showFluidUnit: boolean;

}
