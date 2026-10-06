import {FloatingGroup} from '@src/Components/Planner/Panel/FloatingGroup';
import {PanelRuntimeState} from '@src/Components/Planner/Panel/PanelRuntimeState';
import {PanelSide} from '@src/Components/Planner/Panel/PanelSide';

export interface PanelLayoutState
{
	readonly states: Record<string, PanelRuntimeState>;
	readonly sideTabs: Record<PanelSide, string[]>;
	readonly activeTabIds: Record<PanelSide, string | null>;
	readonly floatingGroups: FloatingGroup[];
	readonly sizes: Record<PanelSide, number>;
}
