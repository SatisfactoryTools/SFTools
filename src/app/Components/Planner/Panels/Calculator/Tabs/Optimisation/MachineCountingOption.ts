import {MachineCountingMode} from '@src/Model/Planner/MachineCountingMode';

export interface MachineCountingOption
{

	readonly value: MachineCountingMode;
	readonly label: string;
	readonly description: string;

}
