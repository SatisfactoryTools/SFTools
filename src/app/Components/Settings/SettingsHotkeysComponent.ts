import {Component, ChangeDetectionStrategy, computed} from '@angular/core';
import {faKeyboard} from '@fortawesome/free-solid-svg-icons';
import {HotkeyInputComponent} from '@src/Components/Settings/HotkeyInputComponent';
import {SettingsSectionComponent} from '@src/Components/Settings/SettingsSectionComponent';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {HotkeyAction} from '@src/Model/Hotkeys/HotkeyAction';
import {HotkeyBinding} from '@src/Model/Hotkeys/HotkeyBinding';
import {HotkeyCatalog} from '@src/Model/Hotkeys/HotkeyCatalog';
import {HotkeyDefinition} from '@src/Model/Hotkeys/HotkeyDefinition';
import {HotkeyFormatter} from '@src/Model/Hotkeys/HotkeyFormatter';
import {HotkeyService} from '@src/Model/Hotkeys/HotkeyService';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';

/**
 * The hotkey list: every action of the app with the key that runs it, grouped
 * by where it lives. Keys are unique across the whole list, so an action is
 * never picked by "what is in focus" - which also means a key used twice is a
 * real problem, and the list says so.
 */
@Component({
	selector: 'settings-hotkeys',
	templateUrl: './SettingsHotkeysComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [SettingsSectionComponent, InfoNoteComponent, HotkeyInputComponent],
	styles: [`
		.hotkey-row {
			display: flex;
			align-items: center;
			gap: 0.75rem;
			padding: 0.3rem 0;
			border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		}
		.hotkey-row:last-child { border-bottom: 0; }
		.hotkey-label {
			flex: 1;
			min-width: 0;
		}
		.hotkey-hint {
			display: block;
			font-size: 0.8rem;
			color: #8a9ab3;
		}
		.hotkey-warning {
			display: block;
			font-size: 0.8rem;
			color: #e58a72;
		}
		.row-actions {
			display: flex;
			gap: 0.25rem;
			flex-shrink: 0;
		}
		.row-actions button {
			border: none;
			background: none;
			padding: 0 0.25rem;
			font-size: 0.8rem;
			color: #8a9ab3;
			cursor: pointer;
		}
		.row-actions button:hover:not(:disabled) { color: #dfe5ec; }
		.row-actions button:disabled { color: #4a5464; cursor: default; }
		@media (max-width: 575.98px) {
			.hotkey-row { flex-wrap: wrap; }
			.hotkey-label { flex-basis: 100%; }
		}
	`],
})
export class SettingsHotkeysComponent
{

	public readonly sectionIcon = faKeyboard;

	public readonly groups = HotkeyCatalog.GROUPS;

	/** Actions whose key another action also uses - both rows are flagged. */
	public readonly conflicts = computed(() => this.hotkeys.conflicts());

	/** How many actions the user has moved off their factory key. */
	public readonly changedCount = computed(() =>
		HotkeyCatalog.DEFINITIONS.filter(definition => this.isChanged(definition)).length);

	public constructor(
		private readonly hotkeys: HotkeyService,
		private readonly formatter: HotkeyFormatter,
		private readonly settings: SettingsManager,
	)
	{
	}

	public definitionsOf(group: string): HotkeyDefinition[]
	{
		return HotkeyCatalog.definitionsOf(group as HotkeyDefinition['group']);
	}

	public binding(action: HotkeyAction): HotkeyBinding | null
	{
		return this.hotkeys.binding(action);
	}

	public isConflicting(action: HotkeyAction): boolean
	{
		return this.conflicts().has(action);
	}

	/** Which other actions share this one's key - named, so the clash can be fixed. */
	public conflictingWith(action: HotkeyAction): string
	{
		const binding = this.binding(action);
		if (!binding || !this.isConflicting(action)) {
			return '';
		}
		return HotkeyCatalog.DEFINITIONS
			.filter(definition => definition.action !== action && this.formatter.same(this.binding(definition.action), binding))
			.map(definition => definition.label)
			.join(', ');
	}

	public isChanged(definition: HotkeyDefinition): boolean
	{
		return !this.formatter.same(this.binding(definition.action), definition.default);
	}

	public setBinding(action: HotkeyAction, binding: HotkeyBinding): void
	{
		this.store(action, binding);
	}

	/** Leaves the action with no key at all - remembered, so it stays cleared. */
	public clear(action: HotkeyAction): void
	{
		this.store(action, null);
	}

	/** Drops the override so the action is back on the key it shipped with. */
	public reset(action: HotkeyAction): void
	{
		const overrides = {...this.settings.hotkeys()};
		delete overrides[action];
		this.settings.updateHotkeys(overrides);
	}

	public resetAll(): void
	{
		this.settings.updateHotkeys({});
	}

	private store(action: HotkeyAction, binding: HotkeyBinding | null): void
	{
		this.settings.updateHotkeys({...this.settings.hotkeys(), [action]: binding});
	}

}
