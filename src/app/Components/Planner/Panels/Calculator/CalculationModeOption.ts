import {CalculationMode} from '@src/Model/Planner/CalculationMode';

export interface CalculationModeOption
{
	readonly mode: CalculationMode;
	readonly label: string;
	readonly description: string;
}
