import {HotkeyItem} from '@src/Model/Hotkeys/HotkeyItem';

/**
 * A part of the app that can run hotkey actions on whatever it has in hand
 * right now - the selected nodes, the open plan. Asked only at the moment a
 * key is pressed, so the answer is always current.
 */
export interface HotkeyItemSource
{

	hotkeyItems(): HotkeyItem[];

}
