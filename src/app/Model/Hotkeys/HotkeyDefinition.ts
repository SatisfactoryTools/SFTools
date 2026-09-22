import {HotkeyAction} from '@src/Model/Hotkeys/HotkeyAction';
import {HotkeyBinding} from '@src/Model/Hotkeys/HotkeyBinding';
import {HotkeyGroup} from '@src/Model/Hotkeys/HotkeyGroup';

/** One bindable action: what it is called, where it lives, and its factory key. */
export interface HotkeyDefinition
{

	readonly action: HotkeyAction;

	readonly group: HotkeyGroup;

	/** Wording for the settings list - the context menu keeps its own labels. */
	readonly label: string;

	/** Says what the action needs to work on, when that is not obvious. */
	readonly hint?: string;

	/** Key the action ships with; null for the ones that start unbound. */
	readonly default: HotkeyBinding | null;

}
