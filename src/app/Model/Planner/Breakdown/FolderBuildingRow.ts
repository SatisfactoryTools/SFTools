import {PlanAmount} from '@src/Model/Planner/Breakdown/PlanAmount';

/** Folder overview row: one building type across every plan of the folder. */
export interface FolderBuildingRow
{

	readonly key: string;

	readonly name: string;

	readonly icon: string | null;

	readonly machines: number;

	readonly plans: PlanAmount[];

}
