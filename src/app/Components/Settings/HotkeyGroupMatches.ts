import {HotkeyDefinition} from '@src/Model/Hotkeys/HotkeyDefinition';
import {HotkeyGroup} from '@src/Model/Hotkeys/HotkeyGroup';

export interface HotkeyGroupMatches
{

	readonly group: HotkeyGroup;
	readonly label: string;
	readonly description: string;
	readonly definitions: HotkeyDefinition[];

}
