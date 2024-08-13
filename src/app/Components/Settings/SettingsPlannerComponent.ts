import {Component, ChangeDetectionStrategy} from '@angular/core';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';

/** "Planner" settings section - currently just the panel-layout reset. */
@Component({
	selector: 'settings-planner',
	templateUrl: './SettingsPlannerComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
})
export class SettingsPlannerComponent
{

	public constructor(private readonly settings: SettingsManager)
	{
	}

	/** Clears the remembered layout; the planner rebuilds its defaults on next open. */
	public resetPanels(): void
	{
		if (confirm('Reset all planner panel positions and sizes to their defaults?')) {
			this.settings.updatePanels(null);
		}
	}

}
