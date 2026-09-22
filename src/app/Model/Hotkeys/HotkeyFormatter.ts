import {Injectable} from '@angular/core';
import {HotkeyBinding} from '@src/Model/Hotkeys/HotkeyBinding';

/** Named keys shown with a shorter, friendlier word than the browser's own. */
const KEY_NAMES: Record<string, string> = {
	' ': 'Space',
	'Escape': 'Esc',
	'Delete': 'Del',
	'ArrowUp': '↑',
	'ArrowDown': '↓',
	'ArrowLeft': '←',
	'ArrowRight': '→',
	'PageUp': 'PgUp',
	'PageDown': 'PgDn',
};

/**
 * Turns a key combination into the text shown to the user, reads one back out
 * of a key event, and reduces both to one comparable signature.
 *
 * Shift needs care: for a printable character that is not a letter the
 * browser already bakes Shift into the character itself ("+" is Shift and "="
 * on most layouts), so comparing Shift separately would never match. The
 * signature therefore drops Shift for those keys and keeps it everywhere else.
 */
@Injectable({providedIn: 'root'})
export class HotkeyFormatter
{

	/** "Ctrl+Shift+D", "Del", "F2" - empty for a missing binding. */
	public format(binding: HotkeyBinding | null): string
	{
		if (!binding) {
			return '';
		}
		const parts: string[] = [];
		if (binding.ctrl) parts.push('Ctrl');
		if (binding.alt) parts.push('Alt');
		if (this.usesShift(binding.key) && binding.shift) parts.push('Shift');
		if (binding.meta) parts.push('Meta');
		parts.push(this.keyName(binding.key));
		return parts.join('+');
	}

	/**
	 * The combination the event stands for; null for a press that is only a
	 * modifier (holding Ctrl is not a hotkey on its own).
	 */
	public fromEvent(event: KeyboardEvent): HotkeyBinding | null
	{
		if (['Control', 'Shift', 'Alt', 'Meta', 'CapsLock', 'Dead'].includes(event.key)) {
			return null;
		}
		const binding: HotkeyBinding = {
			key: this.normalizeKey(event.key),
			ctrl: event.ctrlKey,
			shift: event.shiftKey,
			alt: event.altKey,
			meta: event.metaKey,
		};
		// Store only the modifiers that are actually held, so two bindings
		// written differently still compare equal as plain objects.
		return this.compact(binding);
	}

	/** Canonical text two bindings can be compared by, and looked up with. */
	public signature(binding: HotkeyBinding): string
	{
		const key = this.normalizeKey(binding.key);
		const shift = this.usesShift(key) && binding.shift === true;
		return [
			binding.ctrl === true ? 'ctrl' : '',
			shift ? 'shift' : '',
			binding.alt === true ? 'alt' : '',
			binding.meta === true ? 'meta' : '',
			key,
		].join('+');
	}

	public same(a: HotkeyBinding | null, b: HotkeyBinding | null): boolean
	{
		if (!a || !b) {
			return a === b;
		}
		return this.signature(a) === this.signature(b);
	}

	/** Letters fold to lower case; everything else is the browser's own name. */
	private normalizeKey(key: string): string
	{
		return key.length === 1 ? key.toLowerCase() : key;
	}

	/** Whether Shift is a separate part of this key rather than part of the character. */
	private usesShift(key: string): boolean
	{
		const normalized = this.normalizeKey(key);
		return normalized.length > 1 || (normalized >= 'a' && normalized <= 'z');
	}

	private keyName(key: string): string
	{
		const normalized = this.normalizeKey(key);
		return KEY_NAMES[normalized] ?? (normalized.length === 1 ? normalized.toUpperCase() : normalized);
	}

	private compact(binding: HotkeyBinding): HotkeyBinding
	{
		const compacted: {key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean} = {key: binding.key};
		if (binding.ctrl) compacted.ctrl = true;
		if (binding.shift && this.usesShift(binding.key)) compacted.shift = true;
		if (binding.alt) compacted.alt = true;
		if (binding.meta) compacted.meta = true;
		return compacted;
	}

}
