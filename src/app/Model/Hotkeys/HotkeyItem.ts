import {HotkeyAction} from '@src/Model/Hotkeys/HotkeyAction';

export interface HotkeyItem
{

	readonly hotkey?: HotkeyAction;

	readonly disabled?: boolean;

	readonly action: () => void;

}
