import {Node} from '@src/Model/Planner/Solver/Response/Node';

export interface NodeResizeOptions
{
	readonly minimise: Node | null;
	readonly maximise: Node | null;
}
