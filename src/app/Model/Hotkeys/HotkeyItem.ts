import {HotkeyAction} from '@src/Model/Hotkeys/HotkeyAction';

/**
 * Something a hotkey can run. Context menu entries are exactly this shape
 * with a label added, so a hotkey and its menu row always do the same thing -
 * including staying inert when the row is grayed out.
 */
export interface HotkeyItem
{

	/** The action this entry answers to; entries without one have no hotkey. */
	readonly hotkey?: HotkeyAction;

	readonly disabled?: boolean;

	readonly action: () => void;

}
