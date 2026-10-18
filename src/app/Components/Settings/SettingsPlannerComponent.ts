import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {CalculatorTab} from '@src/Components/Planner/Panels/Calculator/CalculatorTab';
import {CalculatorTabDefinition} from '@src/Components/Planner/Panels/Calculator/CalculatorTabDefinition';
import {CalculatorTabDefinitions} from '@src/Components/Planner/Panels/Calculator/CalculatorTabDefinitions';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';
import {TabLabelsMode} from '@src/Model/Settings/TabLabelsMode';
import {UnmakeableItemsDisplay} from '@src/Model/Settings/UnmakeableItemsDisplay';
import {SettingResetButtonComponent} from '@src/Components/Settings/SettingResetButtonComponent';
import {SettingsSectionComponent} from '@src/Components/Settings/SettingsSectionComponent';
import {faTableColumns} from '@fortawesome/free-solid-svg-icons';

@Component({
	selector: 'settings-planner',
	templateUrl: './SettingsPlannerComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, FormsModule, SettingResetButtonComponent, SettingsSectionComponent],
	styles: [`
		.more-tabs {
			margin: 0.5rem 0 0 1.5em;
			max-width: 480px;
		}
		.more-tabs:disabled {
			opacity: 0.5;
		}
		.more-tabs-grid {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
			column-gap: 1rem;
		}
	`],
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
			description: 'Items that no enabled recipe or generator can produce are not shown.',
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

	public readonly tabDefinitions: readonly CalculatorTabDefinition[] = CalculatorTabDefinitions.ALL;

	public get groupTabs(): boolean
	{
		return this.settings.planner().groupTabs;
	}

	public setGroupTabs(value: boolean): void
	{
		this.settings.updatePlanner({groupTabs: value});
	}

	public isMainTab(tab: CalculatorTab): boolean
	{
		return !this.settings.planner().moreTabs.includes(tab);
	}

	/** The strip always keeps at least one tab of its own next to More. */
	public isLastMainTab(tab: CalculatorTab): boolean
	{
		return this.isMainTab(tab) && this.tabDefinitions.filter(definition => this.isMainTab(definition.id)).length === 1;
	}

	public setMainTab(tab: CalculatorTab, main: boolean): void
	{
		const moreTabs = this.settings.planner().moreTabs.filter(id => id !== tab);
		this.settings.updatePlanner({moreTabs: main ? moreTabs : [...moreTabs, tab]});
	}

	public get helpButtons(): boolean
	{
		return this.settings.planner().helpButtons;
	}

	public setHelpButtons(value: boolean): void
	{
		this.settings.updatePlanner({helpButtons: value});
	}

	public get supporterHearts(): boolean
	{
		return this.settings.planner().supporterHearts;
	}

	public setSupporterHearts(value: boolean): void
	{
		this.settings.updatePlanner({supporterHearts: value});
	}

	public get unmakeableItemsDescription(): string
	{
		return this.unmakeableItemsOptions.find(option => option.value === this.unmakeableItems)?.description ?? '';
	}

	public resetPanels(): void
	{
		if (confirm('Reset all planner panel positions and sizes?')) {
			this.settings.updatePanels(null);
		}
	}

}
