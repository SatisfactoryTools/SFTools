import {NodeColors} from '@src/Model/Settings/NodeColors';

export interface NodeColorPreset
{

	readonly id: string;
	readonly label: string;
	readonly description: string;
	readonly colors: NodeColors;
	readonly fillStrength: number;

}
