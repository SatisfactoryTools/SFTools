import {CalculationMode} from '@src/Model/Planner/CalculationMode';

/** One entry of the calculate button's mode dropdown. */
export interface CalculationModeOption
{
	readonly mode: CalculationMode;
	readonly label: string;
	readonly description: string;
}
