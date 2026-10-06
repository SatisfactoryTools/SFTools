import {GraphDirection} from '@src/Model/Planner/GraphDirection';
import {GraphEdgeShape} from '@src/Model/Planner/GraphEdgeShape';
import {GroupingMode} from '@src/Model/Planner/GroupingMode';

export interface PlanDefaultsSettings
{

	readonly alternateRecipes: boolean;

	readonly conversionRecipes: boolean;

	readonly graphDirection: GraphDirection;

	readonly graphEdgeShape: GraphEdgeShape;

	readonly graphNodeSpacing: number;

	readonly graphLayerSpacing: number;

	readonly groupingMode: GroupingMode;

}
