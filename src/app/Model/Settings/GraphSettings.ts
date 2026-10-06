import {MachineDisplayMode} from '@src/Model/Settings/MachineDisplayMode';
import {NodeColors} from '@src/Model/Settings/NodeColors';

export interface GraphSettings
{

	readonly sloopGlow: boolean;

	readonly showEdgeItemIcons: boolean;

	readonly showEdgeLabelBox: boolean;

	readonly showNodeItemIcons: boolean;

	readonly showNodeBuildingIcons: boolean;

	readonly showSubplanItemIcons: boolean;

	readonly showSloopCornerIcon: boolean;

	readonly machineDisplay: MachineDisplayMode;

	readonly nodeScale: number;

	readonly edgeScale: number;

	readonly nodeColors: NodeColors;

}
