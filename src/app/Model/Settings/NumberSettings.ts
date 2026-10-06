import {DecimalSeparator} from '@src/Model/Settings/DecimalSeparator';
import {PowerDisplay} from '@src/Model/Settings/PowerDisplay';

export interface NumberSettings
{

	readonly decimalSeparator: DecimalSeparator;

	readonly itemAmountPrecision: number;

	readonly clockSpeedPrecision: number;

	readonly machineCountPrecision: number;

	readonly powerDisplay: PowerDisplay;

	readonly showFluidUnit: boolean;

}
