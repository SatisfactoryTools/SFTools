import {RailMetrics} from '@src/Components/Planner/Panel/RailMetrics';
import {RailSize} from '@src/Model/Settings/RailSize';

export class RailSizes
{

	private static readonly METRICS: Record<RailSize, RailMetrics> = {
		tiny: {width: 32, button: 26, icon: 13},
		small: {width: 40, button: 32, icon: 16},
		normal: {width: 48, button: 40, icon: 19},
		large: {width: 56, button: 46, icon: 22},
		huge: {width: 68, button: 56, icon: 27},
	};

	public static of(size: RailSize): RailMetrics
	{
		return RailSizes.METRICS[size] ?? RailSizes.METRICS.small;
	}

}
