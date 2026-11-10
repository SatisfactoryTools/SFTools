import {HotkeyAction} from '@src/Model/Hotkeys/HotkeyAction';

export interface HotkeyMerge
{

	readonly target: HotkeyAction;

	/** In priority order: the first one that still had a key passes it on. */
	readonly sources: readonly string[];

}
