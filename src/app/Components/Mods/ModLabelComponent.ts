import {Component, ChangeDetectionStrategy, Input, computed, signal} from '@angular/core';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';

@Component({
	selector: 'mod-label',
	template: `
		@if (name(); as name) {
			<span class="mod-label" [title]="'From the ' + name + ' mod'">{{ name }}</span>
		}
	`,
	changeDetection: ChangeDetectionStrategy.Eager,
	styles: `
		:host {
			display: inline-flex;
			min-width: 0;
			vertical-align: middle;
		}
		.mod-label {
			display: inline-block;
			max-width: 12em;
			padding: 0 0.35em;
			border: 1px solid #4e5d6c;
			color: #9fb0c0;
			font-size: 0.7rem;
			font-weight: normal;
			line-height: 1.5;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
	`,
})
export class ModLabelComponent
{

	private readonly modSignal = signal<string | null>(null);

	public readonly name = computed<string | null>(() => {
		if (!this.settings.planner().modLabels) {
			return null;
		}
		return this.versionManager.activeVersionData()?.modName(this.modSignal()) ?? null;
	});

	public constructor(
		private readonly versionManager: VersionManager,
		private readonly settings: SettingsManager,
	)
	{
	}

	@Input()
	public set mod(value: string | null | undefined)
	{
		this.modSignal.set(value ?? null);
	}

}
