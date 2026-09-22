import {Type} from '@angular/core';
import {IconDefinition} from '@fortawesome/fontawesome-svg-core';
import {PanelSide} from '@src/Components/Planner/Panel/PanelSide';
import {HelpTopicId} from '@src/Model/Help/HelpTopicId';
import {HotkeyAction} from '@src/Model/Hotkeys/HotkeyAction';

export interface PanelDefinition
{
	readonly id: string;
	readonly label: string;
	readonly icon: IconDefinition;
	readonly component: Type<unknown>;
	readonly defaultSide: PanelSide;
	/** The hotkey that toggles this panel; shown in its rail tooltip. */
	readonly hotkey?: HotkeyAction;
	/** Help topic of the article about this panel; shown as a question mark in its tab bar. */
	readonly helpTopic?: HelpTopicId;
	readonly openByDefault?: boolean;
	readonly defaultFloating?: boolean;
	/** Initial floating-window size; the shared default is used when omitted. */
	readonly defaultFloatWidth?: number;
	readonly defaultFloatHeight?: number;
}