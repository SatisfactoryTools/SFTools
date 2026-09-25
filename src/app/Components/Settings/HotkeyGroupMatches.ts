import {HotkeyDefinition} from '@src/Model/Hotkeys/HotkeyDefinition';
import {HotkeyGroup} from '@src/Model/Hotkeys/HotkeyGroup';

/** One heading of the hotkey list with the actions that survived the search. */
export interface HotkeyGroupMatches
{

	readonly group: HotkeyGroup;
	readonly label: string;
	readonly description: string;
	readonly definitions: HotkeyDefinition[];

}
