import {HotkeyAction} from '@src/Model/Hotkeys/HotkeyAction';
import {HotkeyBinding} from '@src/Model/Hotkeys/HotkeyBinding';
import {HotkeyGroup} from '@src/Model/Hotkeys/HotkeyGroup';

export interface HotkeyDefinition
{

	readonly action: HotkeyAction;

	readonly group: HotkeyGroup;

	readonly label: string;

	readonly hint?: string;

	readonly default: HotkeyBinding | null;

}
