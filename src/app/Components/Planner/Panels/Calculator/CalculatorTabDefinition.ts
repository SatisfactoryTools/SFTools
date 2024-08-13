import {IconDefinition} from '@fortawesome/fontawesome-svg-core';
import {CalculatorTab} from '@src/Components/Planner/Panels/Calculator/CalculatorTab';

export interface CalculatorTabDefinition
{
	readonly id: CalculatorTab;
	readonly label: string;
	readonly icon: IconDefinition;
}
