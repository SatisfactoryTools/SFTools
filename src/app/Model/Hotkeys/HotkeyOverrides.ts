import {HotkeyBinding} from '@src/Model/Hotkeys/HotkeyBinding';

/**
 * The user's own key choices, by action id. A missing entry means "keep the
 * factory key"; an explicit null means the user cleared the action, which is
 * not the same thing.
 */
export type HotkeyOverrides = Record<string, HotkeyBinding | null>;
