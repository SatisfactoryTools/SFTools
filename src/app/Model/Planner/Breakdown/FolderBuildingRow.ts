import {PlanAmount} from '@src/Model/Planner/Breakdown/PlanAmount';

export interface FolderBuildingRow
{

	readonly key: string;

	readonly name: string;

	readonly icon: string | null;

	readonly machines: number;

	readonly plans: PlanAmount[];

}
