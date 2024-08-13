import {Building} from '@src/Model/Data/Entities/Building';
import {Fuel} from '@src/Model/Data/Entities/Parts/Fuel';

/** One enabled generator + fuel combination the solver may burn for power. */
export interface GeneratorFuelOption
{
	readonly generator: Building;
	readonly fuel: Fuel;
}
