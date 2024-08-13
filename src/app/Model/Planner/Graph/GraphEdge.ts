import {GraphPoint} from '@src/Model/Planner/Graph/GraphPoint';

export interface GraphEdge
{
	readonly sourceId: string;
	readonly targetId: string;
	readonly itemClassName: string;
	/** Mutable: adjusted by GraphReconciler to reflect real flow after manual edits. */
	amount: number;
	/**
	 * Edge corners: seeded by ELK routing, then user-editable on the canvas
	 * (hence mutable); straight edge when absent (e.g. old saved plans).
	 */
	vertices?: GraphPoint[];
	/** Label position as a 0–1 ratio along the edge path; 0.5 when absent. */
	labelDistance?: number;
}
