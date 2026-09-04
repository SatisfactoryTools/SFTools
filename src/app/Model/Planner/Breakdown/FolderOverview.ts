import {FolderBuildingRow} from '@src/Model/Planner/Breakdown/FolderBuildingRow';
import {FolderPlanRow} from '@src/Model/Planner/Breakdown/FolderPlanRow';
import {FolderProductionRow} from '@src/Model/Planner/Breakdown/FolderProductionRow';
import {FolderRecipeRow} from '@src/Model/Planner/Breakdown/FolderRecipeRow';
import {FolderResourceRow} from '@src/Model/Planner/Breakdown/FolderResourceRow';
import {FolderGroupMode} from '@src/Model/Planner/FolderGroupMode';
import {PowerDraw} from '@src/Model/Planner/PowerDraw';

/** Everything the Overview panel shows for a folder: totals over its plans, each with a per-plan split. */
export interface FolderOverview
{

	/** Top-level plans of the folder and its subfolders, in tree order (each carries its subplans). */
	readonly plans: FolderPlanRow[];

	/** Groups the folder fixes for its plans, as a readable list; empty when none. */
	readonly fixedSummary: string;

	/** How the folder treats raw-resource limits for its plans. */
	readonly resourcesMode: FolderGroupMode;

	readonly resources: FolderResourceRow[];

	readonly production: FolderProductionRow[];

	readonly buildings: FolderBuildingRow[];

	readonly totalBuildings: number;

	readonly recipes: FolderRecipeRow[];

	readonly consumption: PowerDraw;

	readonly powerProduction: number;

	/** Production minus consumption over the whole folder: a surplus is positive. */
	readonly netPower: PowerDraw;

	readonly shards: number;

	readonly sloops: number;

}
