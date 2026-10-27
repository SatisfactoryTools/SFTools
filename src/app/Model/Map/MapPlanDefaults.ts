import {ConveyorTiers} from '@src/Model/Map/ConveyorTiers';
import {FactorySiteOptions} from '@src/Model/Planner/FactorySiteOptions';
import {MapConveyors} from '@src/Model/Planner/MapConveyors';

export class MapPlanDefaults
{

	public static readonly CONVEYORS: MapConveyors = {
		beltMark: ConveyorTiers.BELTS.length,
		pipeMark: ConveyorTiers.PIPES.length,
	};

	public static readonly FACTORY_SITE: FactorySiteOptions = {
		mode: 'farthest',
		fluidCost: true,
		fluidFactor: 2,
		areaOnly: true,
	};

	public static readonly FLUID_FACTORS: ReadonlyArray<number> = [1.5, 2, 3];

}
