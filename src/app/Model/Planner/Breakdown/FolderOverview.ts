import {FolderBuildingRow} from '@src/Model/Planner/Breakdown/FolderBuildingRow';
import {FolderPlanRow} from '@src/Model/Planner/Breakdown/FolderPlanRow';
import {FolderProductionRow} from '@src/Model/Planner/Breakdown/FolderProductionRow';
import {FolderRecipeRow} from '@src/Model/Planner/Breakdown/FolderRecipeRow';
import {FolderResourceRow} from '@src/Model/Planner/Breakdown/FolderResourceRow';
import {FolderGroupMode} from '@src/Model/Planner/FolderGroupMode';
import {PowerDraw} from '@src/Model/Planner/PowerDraw';

export interface FolderOverview
{

	readonly plans: FolderPlanRow[];

	readonly fixedSummary: string;

	readonly resourcesMode: FolderGroupMode;

	readonly resources: FolderResourceRow[];

	readonly production: FolderProductionRow[];

	readonly buildings: FolderBuildingRow[];

	readonly totalBuildings: number;

	readonly recipes: FolderRecipeRow[];

	readonly consumption: PowerDraw;

	readonly powerProduction: number;

	readonly netPower: PowerDraw;

	readonly shards: number;

	readonly sloops: number;

}
