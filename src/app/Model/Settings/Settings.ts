import {PanelLayoutState} from '@src/Components/Planner/Panel/PanelLayoutState';
import {GraphSettings} from '@src/Model/Settings/GraphSettings';
import {NumberSettings} from '@src/Model/Settings/NumberSettings';
import {PlannerSettings} from '@src/Model/Settings/PlannerSettings';

/** Global, user-scoped application settings (not tied to a game version). */
export interface Settings
{

	readonly numbers: NumberSettings;

	readonly graph: GraphSettings;

	readonly planner: PlannerSettings;

	/** Remembered planner panel layout (positions/sizes); null = defaults. */
	readonly panels: PanelLayoutState | null;

}
