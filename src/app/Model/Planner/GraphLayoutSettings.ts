import {GraphDirection} from '@src/Model/Planner/GraphDirection';
import {GraphEdgeShape} from '@src/Model/Planner/GraphEdgeShape';

export interface GraphLayoutSettings
{
	readonly direction: GraphDirection;
	readonly edgeShape: GraphEdgeShape;
	readonly nodeSpacing: number;
	readonly layerSpacing: number;
	/** Per plan rather than global: the machine list is version-specific. */
	readonly machineColors: Record<string, string>;
}
