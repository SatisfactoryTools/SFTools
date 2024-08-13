import {MachineDisplayMode} from '@src/Model/Settings/MachineDisplayMode';
import {NodeColors} from '@src/Model/Settings/NodeColors';

/**
 * Global (version-agnostic) graph rendering settings. Per-machine recipe
 * colouring lives in the per-plan graph settings instead, since it needs the
 * active version's machine list.
 */
export interface GraphSettings
{

	/** Soft coloured glow around slooped recipe nodes. */
	readonly sloopGlow: boolean;

	/** Item icons on graph edge labels. */
	readonly showEdgeItemIcons: boolean;

	/** Item icons on the item-source/product nodes that carry one. */
	readonly showNodeItemIcons: boolean;

	/** Building icons on recipe and generator nodes. */
	readonly showNodeBuildingIcons: boolean;

	/** Input/output item icons down the sides of subplan nodes. */
	readonly showSubplanItemIcons: boolean;

	/** Somersloop icon in the top-right corner of slooped recipe nodes. */
	readonly showSloopCornerIcon: boolean;

	/** How recipe nodes present machine counts and clock speeds. */
	readonly machineDisplay: MachineDisplayMode;

	readonly nodeColors: NodeColors;

}
