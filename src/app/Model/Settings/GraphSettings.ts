import {MachineDisplayMode} from '@src/Model/Settings/MachineDisplayMode';
import {NodeColors} from '@src/Model/Settings/NodeColors';

export interface GraphSettings
{

	readonly sloopGlow: boolean;

	readonly simplifyWhenZoomedOut: boolean;

	readonly showEdgeItemIcons: boolean;

	readonly showEdgeLabelBoxes: boolean;

	readonly showNodeItemIcons: boolean;

	readonly showNodeBuildingIcons: boolean;

	readonly showSubplanItemIcons: boolean;

	readonly showSloopCornerIcon: boolean;

	readonly machineDisplay: MachineDisplayMode;

	readonly nodeScale: number;

	readonly edgeScale: number;

	readonly nodeAccentColors: NodeColors;

	/** Node fill = accent colour × this (0-1). */
	readonly nodeFillAmount: number;

}
