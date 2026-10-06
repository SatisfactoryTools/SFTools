import {HotkeyBinding} from '@src/Model/Hotkeys/HotkeyBinding';

/** A missing entry keeps the factory key; an explicit null means the user cleared the action. */
export type HotkeyOverrides = Record<string, HotkeyBinding | null>;
