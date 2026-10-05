import {GraphDirection} from '@src/Model/Planner/GraphDirection';
import {GraphEdgeShape} from '@src/Model/Planner/GraphEdgeShape';

export interface GraphLayoutSettings
{
	readonly direction: GraphDirection;
	readonly edgeShape: GraphEdgeShape;
	/** Graph units, between nodes of the same rank. */
	readonly nodeSpacing: number;
	/** Graph units, between ranks. */
	readonly layerSpacing: number;
	/** Hex accent per machine class name; per plan rather than global because the machine list is version-specific. */
	readonly machineColors: Record<string, string>;
}
