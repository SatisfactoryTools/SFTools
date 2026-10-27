import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {faMap} from '@fortawesome/free-solid-svg-icons';
import {SettingResetButtonComponent} from '@src/Components/Settings/SettingResetButtonComponent';
import {SettingsSectionComponent} from '@src/Components/Settings/SettingsSectionComponent';
import {MapCoordinateUnit} from '@src/Model/Settings/MapCoordinateUnit';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';

@Component({
	selector: 'settings-map',
	templateUrl: './SettingsMapComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, SettingResetButtonComponent, SettingsSectionComponent],
})
export class SettingsMapComponent
{

	public readonly sectionIcon = faMap;

	public constructor(private readonly settings: SettingsManager)
	{
	}

	public get coordinates(): MapCoordinateUnit
	{
		return this.settings.map().coordinates;
	}

	public setCoordinates(value: MapCoordinateUnit): void
	{
		this.settings.updateMap({coordinates: value});
	}

	public get arachnophobia(): boolean
	{
		return this.settings.map().arachnophobia;
	}

	public setArachnophobia(value: boolean): void
	{
		this.settings.updateMap({arachnophobia: value});
	}

}
