import {Injectable, Signal, computed, signal} from '@angular/core';
import {HotkeyAction} from '@src/Model/Hotkeys/HotkeyAction';
import {HotkeyBinding} from '@src/Model/Hotkeys/HotkeyBinding';
import {HotkeyCatalog} from '@src/Model/Hotkeys/HotkeyCatalog';
import {HotkeyFormatter} from '@src/Model/Hotkeys/HotkeyFormatter';
import {HotkeyItemSource} from '@src/Model/Hotkeys/HotkeyItemSource';
import {HotkeyRegistration} from '@src/Model/Hotkeys/HotkeyRegistration';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';

/**
 * Resolves which key runs which action and dispatches key presses to it.
 *
 * Two ways to answer a key: a plain handler (`register`) for things a single
 * component owns - zooming, opening a panel - and an item source
 * (`registerSource`) for the context-menu actions, which hands back the menu
 * entries that fit the current selection so the hotkey does exactly what the
 * menu row does. Because no two actions share a key, the first source that
 * knows the action is the right one.
 */
@Injectable({providedIn: 'root'})
export class HotkeyService
{

	/** Each action's key: the user's own choice where there is one, the factory key otherwise. */
	public readonly bindings: Signal<Map<HotkeyAction, HotkeyBinding>> = computed(() => {
		const overrides = this.settings.hotkeys();
		const bindings = new Map<HotkeyAction, HotkeyBinding>();
		HotkeyCatalog.DEFINITIONS.forEach(definition => {
			const binding = definition.action in overrides ? overrides[definition.action] : definition.default;
			if (binding) {
				bindings.set(definition.action, binding);
			}
		});
		return bindings;
	});

	/**
	 * Actions sharing one key. Nothing stops the user from making a clash -
	 * the settings list points it out instead, and a clashing key runs the
	 * action listed first.
	 */
	public readonly conflicts: Signal<Set<HotkeyAction>> = computed(() => {
		const seen = new Map<string, HotkeyAction>();
		const clashing = new Set<HotkeyAction>();
		this.bindings().forEach((binding, action) => {
			const signature = this.formatter.signature(binding);
			const first = seen.get(signature);
			if (first === undefined) {
				seen.set(signature, action);
			} else {
				clashing.add(first);
				clashing.add(action);
			}
		});
		return clashing;
	});

	private readonly bySignature: Signal<Map<string, HotkeyAction>> = computed(() => {
		const map = new Map<string, HotkeyAction>();
		this.bindings().forEach((binding, action) => {
			const signature = this.formatter.signature(binding);
			if (!map.has(signature)) {
				map.set(signature, action);
			}
		});
		return map;
	});

	private readonly handlers = new Map<HotkeyAction, (() => void)[]>();

	private readonly sources: HotkeyItemSource[] = [];

	/** Open dialogs park the hotkeys - counted, because two can overlap. */
	private readonly blockersSignal = signal(0);

	public constructor(
		private readonly settings: SettingsManager,
		private readonly formatter: HotkeyFormatter,
	)
	{
	}

	public binding(action: HotkeyAction): HotkeyBinding | null
	{
		return this.bindings().get(action) ?? null;
	}

	/** The key's text for a menu row or a tooltip; empty when the action has none. */
	public label(action: HotkeyAction | undefined): string
	{
		return action === undefined ? '' : this.formatter.format(this.binding(action));
	}

	/** " (Ctrl+Z)" for a tooltip, empty when the action has no key. */
	public suffix(action: HotkeyAction | undefined): string
	{
		const label = this.label(action);
		return label === '' ? '' : ` (${label})`;
	}

	public register(action: HotkeyAction, handler: () => void): HotkeyRegistration
	{
		const handlers = this.handlers.get(action) ?? [];
		handlers.push(handler);
		this.handlers.set(action, handlers);
		return {
			unregister: (): void => {
				const remaining = (this.handlers.get(action) ?? []).filter(candidate => candidate !== handler);
				this.handlers.set(action, remaining);
			},
		};
	}

	public registerSource(source: HotkeyItemSource): HotkeyRegistration
	{
		this.sources.push(source);
		return {
			unregister: (): void => {
				const index = this.sources.indexOf(source);
				if (index >= 0) {
					this.sources.splice(index, 1);
				}
			},
		};
	}

	/** Holds every hotkey while a dialog is open; release it when the dialog closes. */
	public block(): HotkeyRegistration
	{
		this.blockersSignal.update(count => count + 1);
		let released = false;
		return {
			unregister: (): void => {
				if (!released) {
					released = true;
					this.blockersSignal.update(count => Math.max(0, count - 1));
				}
			},
		};
	}

	/**
	 * Runs whatever the key press stands for. Returns whether something ran,
	 * so the caller can keep the browser's own behaviour when nothing did.
	 */
	public handle(event: KeyboardEvent): boolean
	{
		if (this.blockersSignal() > 0 || this.isTyping()) {
			return false;
		}
		const binding = this.formatter.fromEvent(event);
		if (!binding) {
			return false;
		}
		const action = this.bySignature().get(this.formatter.signature(binding));
		return action !== undefined && this.run(action);
	}

	/** Runs an action the same way a key press would; false when nothing could. */
	public run(action: HotkeyAction): boolean
	{
		for (const source of this.sources) {
			const item = source.hotkeyItems().find(candidate => candidate.hotkey === action);
			if (item) {
				// A grayed-out entry still claims the key - the action exists
				// here, it just cannot run, and no other source should answer.
				if (!item.disabled) {
					item.action();
				}
				return true;
			}
		}
		// The last registration wins: an inner component that took an action
		// over speaks for it while it is alive.
		const handlers = this.handlers.get(action) ?? [];
		const handler = handlers[handlers.length - 1];
		if (!handler) {
			return false;
		}
		handler();
		return true;
	}

	/** Text fields keep every key to themselves, including the plain letters. */
	private isTyping(): boolean
	{
		const active = document.activeElement;
		return active instanceof HTMLInputElement
			|| active instanceof HTMLTextAreaElement
			|| active instanceof HTMLSelectElement
			|| (active instanceof HTMLElement && active.isContentEditable);
	}

}
