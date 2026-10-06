import {GeothermalGenerators} from '@src/Model/Planner/GeothermalGenerators';
import {PowerDraw} from '@src/Model/Planner/PowerDraw';

export interface GeyserPurity
{

	readonly key: keyof GeothermalGenerators;

	readonly label: string;

	readonly count: number;

	readonly available: number | null;

	readonly power: PowerDraw;

}
