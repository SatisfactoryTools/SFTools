import {GraphDirection} from '@src/Model/Planner/GraphDirection';
import {GraphEdgeShape} from '@src/Model/Planner/GraphEdgeShape';
import {GroupingMode} from '@src/Model/Planner/GroupingMode';

/**
 * What a plan uses for the things it does not set itself. A plan only stores
 * a recipe selection, a graph layout or a grouping mode once it is changed
 * there - until then these values apply, so changing one here changes every
 * plan that never touched it.
 */
export interface PlanDefaultsSettings
{

	/** Alternate recipes start enabled. */
	readonly alternateRecipes: boolean;

	/** Resource conversion recipes (a raw resource plus Reanimated SAM into another one) start enabled. */
	readonly conversionRecipes: boolean;

	readonly graphDirection: GraphDirection;

	readonly graphEdgeShape: GraphEdgeShape;

	/** Gap in graph units between nodes within the same rank. */
	readonly graphNodeSpacing: number;

	/** Gap in graph units between ranks (layers). */
	readonly graphLayerSpacing: number;

	/** How the machines of a new node are split into groups and clocked. */
	readonly groupingMode: GroupingMode;

}
