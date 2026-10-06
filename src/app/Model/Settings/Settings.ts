import {PanelLayoutState} from '@src/Components/Planner/Panel/PanelLayoutState';
import {HotkeyOverrides} from '@src/Model/Hotkeys/HotkeyOverrides';
import {AccountSettings} from '@src/Model/Settings/AccountSettings';
import {GraphSettings} from '@src/Model/Settings/GraphSettings';
import {NumberSettings} from '@src/Model/Settings/NumberSettings';
import {PlanDefaultsSettings} from '@src/Model/Settings/PlanDefaultsSettings';
import {PlannerSettings} from '@src/Model/Settings/PlannerSettings';

export interface Settings
{

	readonly numbers: NumberSettings;

	readonly graph: GraphSettings;

	readonly planner: PlannerSettings;

	readonly planDefaults: PlanDefaultsSettings;

	readonly account: AccountSettings;

	readonly hotkeys: HotkeyOverrides;

	readonly panels: PanelLayoutState | null;

}
