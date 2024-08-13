import {Node} from '@src/Model/Planner/Solver/Response/Node';

/**
 * Prebuilt replacement nodes for the node menu's minimise/maximise entries;
 * null means the action does not apply (no edges, already there, or the node
 * cannot resize) and the entry renders grayed out.
 */
export interface NodeResizeOptions
{
	readonly minimise: Node | null;
	readonly maximise: Node | null;
}
