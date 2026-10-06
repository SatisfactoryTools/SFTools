import {PowerDraw} from '@src/Model/Planner/PowerDraw';
import {PowerRow} from '@src/Model/Planner/Breakdown/PowerRow';

export interface PowerBreakdown
{

	readonly rows: PowerRow[];

	readonly consumption: PowerDraw;

	readonly production: number;

	readonly net: PowerDraw;

}
