import {PanelSide} from '@src/Components/Planner/Panel/PanelSide';

export interface PanelRuntimeState
{
	readonly side: PanelSide;
	readonly open: boolean;
	readonly floating: boolean;
}
