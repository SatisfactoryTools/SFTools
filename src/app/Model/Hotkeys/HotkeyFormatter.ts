import {Injectable} from '@angular/core';
import {HotkeyBinding} from '@src/Model/Hotkeys/HotkeyBinding';

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
 * For a printable non-letter the browser bakes Shift into the character itself ("+" is Shift and "=" on most
 * layouts), so comparing Shift separately would never match: the signature drops Shift for those keys only.
 */
@Injectable({providedIn: 'root'})
export class HotkeyFormatter
{

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
		// Only the modifiers actually held are stored, so two bindings written differently compare equal as plain objects.
		return this.compact(binding);
	}

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

	private normalizeKey(key: string): string
	{
		return key.length === 1 ? key.toLowerCase() : key;
	}

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
