import {Component, ChangeDetectionStrategy, computed, signal} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faKeyboard, faMagnifyingGlass, faXmark} from '@fortawesome/free-solid-svg-icons';
import {HotkeyGroupMatches} from '@src/Components/Settings/HotkeyGroupMatches';
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
 *
 * The list can be searched two ways, and they can be used together: by typing
 * a word, which looks at the action's name, its note and its key text, and by
 * pressing a key combination, which shows whatever that combination runs.
 */
@Component({
	selector: 'settings-hotkeys',
	templateUrl: './SettingsHotkeysComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [SettingsSectionComponent, InfoNoteComponent, HotkeyInputComponent, FaIconComponent],
	styles: [`
		.hotkey-search {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			flex-wrap: wrap;
			margin: 0.75rem 0;
		}
		.text-search {
			position: relative;
			flex: 1;
			min-width: 12rem;
		}
		.search-icon {
			position: absolute;
			left: 0.6rem;
			top: 50%;
			transform: translateY(-50%);
			pointer-events: none;
			color: #9fb0c0;
		}
		.text-search input {
			padding-left: 1.9rem;
		}
		.text-search input::-webkit-search-cancel-button {
			display: none;
		}
		.clear-btn {
			border: 0;
			background: transparent;
			color: #9fb0c0;
			padding: 0 0.4rem;
			line-height: 1;
		}
		.clear-btn:hover { color: #dfe5ec; }
		.search-by-key {
			display: flex;
			align-items: center;
			gap: 0.35rem;
			font-size: 0.85rem;
			color: #8a9ab3;
		}
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

	public readonly searchIcon = faMagnifyingGlass;

	public readonly clearIcon = faXmark;

	/** What was typed into the search box - matched against names, notes and key text. */
	private readonly querySignal = signal('');

	public readonly query = this.querySignal.asReadonly();

	/** The combination pressed into the key field - shows what it runs, if anything. */
	private readonly keyQuerySignal = signal<HotkeyBinding | null>(null);

	public readonly keyQuery = this.keyQuerySignal.asReadonly();

	public readonly searching = computed(() => this.querySignal().trim() !== '' || this.keyQuerySignal() !== null);

	/** Actions whose key another action also uses - both rows are flagged. */
	public readonly conflicts = computed(() => this.hotkeys.conflicts());

	/** The headings to show, each with the actions the search left in it. */
	public readonly groups = computed<HotkeyGroupMatches[]>(() => {
		const terms = this.searchTerms();
		const key = this.keyQuerySignal();
		return HotkeyCatalog.GROUPS
			.map(group => ({
				...group,
				definitions: HotkeyCatalog.definitionsOf(group.group)
					.filter(definition => this.matches(definition, terms, key)),
			}))
			.filter(group => group.definitions.length > 0);
	});

	public readonly totalCount = HotkeyCatalog.DEFINITIONS.length;

	public readonly matchCount = computed(() =>
		this.groups().reduce((count, group) => count + group.definitions.length, 0));

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

	public binding(action: HotkeyAction): HotkeyBinding | null
	{
		return this.hotkeys.binding(action);
	}

	public onQueryInput(event: Event): void
	{
		this.querySignal.set((event.target as HTMLInputElement).value);
	}

	public setKeyQuery(binding: HotkeyBinding): void
	{
		this.keyQuerySignal.set(binding);
	}

	public clearSearch(): void
	{
		this.querySignal.set('');
		this.keyQuerySignal.set(null);
	}

	public clearKeyQuery(): void
	{
		this.keyQuerySignal.set(null);
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

	/** Every word typed has to be found somewhere in the row, in any order. */
	private searchTerms(): string[]
	{
		return this.querySignal().toLowerCase().split(/\s+/).filter(term => term !== '');
	}

	private matches(definition: HotkeyDefinition, terms: string[], key: HotkeyBinding | null): boolean
	{
		const binding = this.binding(definition.action);
		if (key !== null && !this.formatter.same(binding, key)) {
			return false;
		}
		if (terms.length === 0) {
			return true;
		}
		const haystack = [
			definition.label,
			definition.hint ?? '',
			HotkeyCatalog.GROUPS.find(group => group.group === definition.group)?.label ?? '',
			this.formatter.format(binding),
		].join(' ').toLowerCase();
		return terms.every(term => haystack.includes(term));
	}

}
