import {Building} from '@src/Model/Data/Entities/Building';
import {Fuel} from '@src/Model/Data/Entities/Parts/Fuel';

export interface GeneratorFuelOption
{
	readonly generator: Building;
	readonly fuel: Fuel;
	readonly clockSpeed: number;
}
