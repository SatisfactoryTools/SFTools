import {PanelLayoutState} from '@src/Components/Planner/Panel/PanelLayoutState';
import {HotkeyOverrides} from '@src/Model/Hotkeys/HotkeyOverrides';
import {AccountSettings} from '@src/Model/Settings/AccountSettings';
import {GraphSettings} from '@src/Model/Settings/GraphSettings';
import {NumberSettings} from '@src/Model/Settings/NumberSettings';
import {PlannerSettings} from '@src/Model/Settings/PlannerSettings';

/** Global, user-scoped application settings (not tied to a game version). */
export interface Settings
{

	readonly numbers: NumberSettings;

	readonly graph: GraphSettings;

	readonly planner: PlannerSettings;

	readonly account: AccountSettings;

	/** Key combinations the user changed; the rest keep their factory keys. */
	readonly hotkeys: HotkeyOverrides;

	/** Remembered planner panel layout (positions/sizes); null = defaults. */
	readonly panels: PanelLayoutState | null;

}
