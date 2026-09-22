import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';
import {TabLabelsMode} from '@src/Model/Settings/TabLabelsMode';
import {UnmakeableItemsDisplay} from '@src/Model/Settings/UnmakeableItemsDisplay';
import {SettingsSectionComponent} from '@src/Components/Settings/SettingsSectionComponent';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {faTableColumns} from '@fortawesome/free-solid-svg-icons';

/** "Planner" settings section - unmakeable-items display, help buttons and the panel-layout reset. */
@Component({
	selector: 'settings-planner',
	templateUrl: './SettingsPlannerComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, SettingsSectionComponent, InfoNoteComponent],
})
export class SettingsPlannerComponent
{

	public readonly sectionIcon = faTableColumns;

	public readonly unmakeableItemsOptions: {value: UnmakeableItemsDisplay; label: string; description: string}[] = [
		{
			value: 'show',
			label: 'Show all items',
			description: 'Item lists show every item, even those the plan cannot produce.',
		},
		{
			value: 'strike',
			label: 'Cross out items the plan cannot produce',
			description: 'Items that no enabled recipe or generator can produce are crossed out and moved to the end of the list.',
		},
		{
			value: 'hide',
			label: 'Hide items the plan cannot produce (no spoilers)',
			description: 'Items that no enabled recipe or generator can produce are not shown at all. Nothing is spoiled before you unlock it.',
		},
	];

	public constructor(private readonly settings: SettingsManager)
	{
	}

	public get unmakeableItems(): UnmakeableItemsDisplay
	{
		return this.settings.planner().unmakeableItems;
	}

	public setUnmakeableItems(value: UnmakeableItemsDisplay): void
	{
		this.settings.updatePlanner({unmakeableItems: value});
	}

	public readonly tabLabelsOptions: {value: TabLabelsMode; label: string; description: string}[] = [
		{value: 'auto', label: 'Fit to width', description: 'Text labels when the whole row fits. Otherwise icons, with a label only on the active tab. A dropdown on narrow panels.'},
		{value: 'icons', label: 'Icons only', description: 'Icons, with a label only on the active tab. A dropdown on narrow panels.'},
		{value: 'labels', label: 'Always labels', description: 'A text label on every tab, on more rows when needed. A dropdown on panels too narrow even for icons.'},
	];

	public get tabLabels(): TabLabelsMode
	{
		return this.settings.planner().tabLabels;
	}

	public setTabLabels(value: TabLabelsMode): void
	{
		this.settings.updatePlanner({tabLabels: value});
	}

	public get tabLabelsDescription(): string
	{
		return this.tabLabelsOptions.find(option => option.value === this.tabLabels)?.description ?? '';
	}

	public get tabBadges(): boolean
	{
		return this.settings.planner().tabBadges;
	}

	public setTabBadges(value: boolean): void
	{
		this.settings.updatePlanner({tabBadges: value});
	}

	public get helpButtons(): boolean
	{
		return this.settings.planner().helpButtons;
	}

	public setHelpButtons(value: boolean): void
	{
		this.settings.updatePlanner({helpButtons: value});
	}

	public get unmakeableItemsDescription(): string
	{
		return this.unmakeableItemsOptions.find(option => option.value === this.unmakeableItems)?.description ?? '';
	}

	/** Clears the remembered layout; the planner rebuilds its defaults on next open. */
	public resetPanels(): void
	{
		if (confirm('Put all planner panels back to their default positions and sizes?')) {
			this.settings.updatePanels(null);
		}
	}

}
