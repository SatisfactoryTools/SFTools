import {FactorySiteMode} from '@src/Model/Map/FactorySite/FactorySiteMode';

export interface FactorySiteOptions
{
	readonly mode: FactorySiteMode;
	readonly fluidCost: boolean;
	/** Fluid distances count this many times: pipes are harder to run than belts. */
	readonly fluidFactor: number;
	/** Only nodes inside the plan's resource area, the ones its limits were counted from. */
	readonly areaOnly: boolean;
}
