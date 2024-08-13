import {Component, ChangeDetectionStrategy, signal, Signal} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faHashtag, faDiagramProject, faTableColumns} from '@fortawesome/free-solid-svg-icons';
import {SettingsGraphComponent} from '@src/Components/Settings/SettingsGraphComponent';
import {SettingsNumbersComponent} from '@src/Components/Settings/SettingsNumbersComponent';
import {SettingsPlannerComponent} from '@src/Components/Settings/SettingsPlannerComponent';
import {SettingsSection} from '@src/Components/Settings/SettingsSection';

/**
 * The global settings screen: a left panel listing sections and a wider right
 * panel showing the selected section's controls (standard Bootstrap columns).
 */
@Component({
	templateUrl: './SettingsComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, SettingsNumbersComponent, SettingsGraphComponent, SettingsPlannerComponent],
})
export class SettingsComponent
{

	public readonly sections: SettingsSection[] = [
		{id: 'numbers', label: 'Numbers', icon: faHashtag},
		{id: 'graph', label: 'Graph', icon: faDiagramProject},
		{id: 'planner', label: 'Planner', icon: faTableColumns},
	];

	private readonly activeSectionSignal = signal<string>('numbers');
	public readonly activeSection: Signal<string> = this.activeSectionSignal.asReadonly();

	public selectSection(id: string): void
	{
		this.activeSectionSignal.set(id);
	}

}
