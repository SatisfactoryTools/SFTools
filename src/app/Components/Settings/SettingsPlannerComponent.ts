import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';
import {UnmakeableItemsDisplay} from '@src/Model/Settings/UnmakeableItemsDisplay';

/** "Planner" settings section - unmakeable-items display and the panel-layout reset. */
@Component({
	selector: 'settings-planner',
	templateUrl: './SettingsPlannerComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule],
})
export class SettingsPlannerComponent
{

	public readonly unmakeableItemsOptions: {value: UnmakeableItemsDisplay; label: string; description: string}[] = [
		{
			value: 'show',
			label: 'Show all items',
			description: 'Item pickers offer every item, whether or not the plan can produce it.',
		},
		{
			value: 'strike',
			label: 'Strike through unavailable items',
			description: 'Items no enabled recipe or generator can produce are struck through and moved to the end of the list.',
		},
		{
			value: 'hide',
			label: 'Hide unavailable items (spoiler protection)',
			description: 'Items no enabled recipe or generator can produce are not offered at all - nothing is spoiled before you unlock it.',
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

	public get unmakeableItemsDescription(): string
	{
		return this.unmakeableItemsOptions.find(option => option.value === this.unmakeableItems)?.description ?? '';
	}

	/** Clears the remembered layout; the planner rebuilds its defaults on next open. */
	public resetPanels(): void
	{
		if (confirm('Reset all planner panel positions and sizes to their defaults?')) {
			this.settings.updatePanels(null);
		}
	}

}
