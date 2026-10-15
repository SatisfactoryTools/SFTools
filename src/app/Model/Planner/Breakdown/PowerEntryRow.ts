import {PowerDraw} from '@src/Model/Planner/PowerDraw';

export interface PowerEntryRow
{

	readonly key: string;

	readonly name: string;

	readonly machines: number;

	readonly builtMachines: number;

	readonly detail: string;

	readonly power: PowerDraw;

	/** Empty when the row is not on this plan's canvas (folder views, buildings inside subplans). */
	readonly nodeIds: string[];

}
