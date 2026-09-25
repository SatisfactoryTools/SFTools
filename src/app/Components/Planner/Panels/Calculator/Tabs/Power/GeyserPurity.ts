import {GeothermalGenerators} from '@src/Model/Planner/GeothermalGenerators';
import {PowerDraw} from '@src/Model/Planner/PowerDraw';

/** One geyser purity row of the Power tab. */
export interface GeyserPurity
{

	readonly key: keyof GeothermalGenerators;

	readonly label: string;

	/** Geysers of this purity the plan uses. */
	readonly count: number;

	/** How many the map has, or null when the version carries no world data. */
	readonly available: number | null;

	/** What one generator on a geyser of this purity makes. */
	readonly power: PowerDraw;

}
