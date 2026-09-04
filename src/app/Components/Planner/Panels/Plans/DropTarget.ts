import {DropPosition} from '@src/Components/Planner/Panels/Plans/DropPosition';

/** The tree row currently hovered by a drag, and the position within it. */
export interface DropTarget
{

	readonly id: string;

	readonly position: DropPosition;

}
