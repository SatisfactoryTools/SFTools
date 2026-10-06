import {PowerDraw} from '@src/Model/Planner/PowerDraw';

export interface PowerEntryRow
{

	readonly key: string;

	readonly name: string;

	readonly machines: number;

	readonly detail: string;

	readonly power: PowerDraw;

}
