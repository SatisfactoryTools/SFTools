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
	readonly hotkey?: HotkeyAction;
	readonly helpTopic?: HelpTopicId;
	readonly openByDefault?: boolean;
	readonly defaultFloating?: boolean;
	readonly defaultFloatWidth?: number;
	readonly defaultFloatHeight?: number;
}