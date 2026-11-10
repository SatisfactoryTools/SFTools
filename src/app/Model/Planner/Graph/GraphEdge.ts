import {GraphPoint} from '@src/Model/Planner/Graph/GraphPoint';

export interface GraphEdge
{
	readonly sourceId: string;
	readonly targetId: string;
	readonly itemClassName: string;
	/** Not readonly: GraphReconciler adjusts it after manual edits. */
	amount: number;
	/** Saves from before edges had their own flag are migrated in PlanSerializer. */
	done: boolean;
	vertices?: GraphPoint[];
	labelDistance?: number;
}
