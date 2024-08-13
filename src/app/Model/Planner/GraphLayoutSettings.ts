import {GraphDirection} from '@src/Model/Planner/GraphDirection';
import {GraphEdgeShape} from '@src/Model/Planner/GraphEdgeShape';

/**
 * Per-plan ELK layout configuration, applied to every layout call for that
 * plan's graph. Stored in PlanSettings; subplans inherit their parent's
 * values at creation (folders will join the cascade later).
 */
export interface GraphLayoutSettings
{
	readonly direction: GraphDirection;
	readonly edgeShape: GraphEdgeShape;
	/** Gap in graph units between nodes within the same rank. */
	readonly nodeSpacing: number;
	/** Gap in graph units between ranks (layers). */
	readonly layerSpacing: number;
	/**
	 * Accent colour (hex) per machine class name. A machine present here
	 * overrides the default recipe colour for its recipe nodes; absent machines
	 * keep it. Lives here (not in global settings) because the machine list is
	 * version-specific.
	 */
	readonly machineColors: Record<string, string>;
}
