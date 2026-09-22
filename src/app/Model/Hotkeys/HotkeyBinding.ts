/**
 * One key combination. `key` is the browser's `KeyboardEvent.key`, with
 * letters folded to lower case so "A" and "a" are the same binding.
 */
export interface HotkeyBinding
{

	readonly key: string;

	readonly ctrl?: boolean;

	readonly shift?: boolean;

	readonly alt?: boolean;

	readonly meta?: boolean;

}
