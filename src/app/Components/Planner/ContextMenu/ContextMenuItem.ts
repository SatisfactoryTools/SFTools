import {IconDefinition} from '@fortawesome/free-solid-svg-icons';
import {HotkeyItem} from '@src/Model/Hotkeys/HotkeyItem';

/**
 * One row of a context menu. It is also the shape the hotkey service runs, so
 * an entry that names a `hotkey` can be triggered from the keyboard without
 * opening the menu - and the row shows which key that is.
 */
export interface ContextMenuItem extends HotkeyItem
{
	readonly label: string;
	readonly icon?: IconDefinition;
	readonly disabled?: boolean;
	/** Explains the entry on hover - also on a grayed one, where it says why. */
	readonly hint?: string;
	readonly action: () => void;
}
