import {MachineDisplayMode} from '@src/Model/Settings/MachineDisplayMode';
import {NodeColors} from '@src/Model/Settings/NodeColors';

export interface GraphSettings
{

	readonly sloopGlow: boolean;

	readonly simplifyWhenZoomedOut: boolean;

	readonly showEdgeItemIcons: boolean;

	readonly showEdgeLabelBoxes: boolean;

	readonly edgeColor: string;

	/** null follows the connection colour. */
	readonly edgeLabelBoxBorder: string | null;

	readonly edgeLabelBoxFill: string;

	/** Line width in px, before highlighting. */
	readonly edgeWidth: number;

	/** Arrowhead length in px. */
	readonly edgeArrowSize: number;

	readonly autoDoneConnections: boolean;

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
