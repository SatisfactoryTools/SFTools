import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {IconDefinition, faRotateLeft} from '@fortawesome/free-solid-svg-icons';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {HelpButtonComponent} from '@src/Components/Help/HelpButtonComponent';
import {HelpTopicId} from '@src/Model/Help/HelpTopicId';
import {SettingsCategory} from '@src/Model/Settings/SettingsCategory';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';

@Component({
	selector: 'settings-section',
	templateUrl: './SettingsSectionComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [AppTooltipDirective, FaIconComponent, HelpButtonComponent],
	// The title input would otherwise stay on the host as a native title attribute and tooltip the whole card.
	host: {'[attr.title]': 'null'},
	styles: [`
		:host {
			display: block;
		}
		.section-reset {
			white-space: nowrap;
		}
		.section-icon {
			width: 1.75rem;
			height: 1.75rem;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			background: rgba(76, 155, 232, 0.16);
			color: #4c9be8;
			font-size: 0.85rem;
			flex-shrink: 0;
		}
	`],
})
export class SettingsSectionComponent
{

	@Input({required: true}) public title = '';
	@Input({required: true}) public icon!: IconDefinition;
	@Input() public description = '';

	@Input() public helpTopic: HelpTopicId | '' = '';

	@Input() public resetCategories: readonly SettingsCategory[] = [];

	/** Added to the confirmation when a reset reaches further than this page. */
	@Input() public resetWarning = '';

	public readonly faRotateLeft = faRotateLeft;

	public constructor(private readonly settings: SettingsManager)
	{
	}

	public get isDefault(): boolean
	{
		return this.settings.isDefault(this.resetCategories);
	}

	public reset(): void
	{
		const message = `Put every setting on the "${this.title}" page back to its default?` + (this.resetWarning !== '' ? `\n\n${this.resetWarning}` : '');
		if (confirm(message)) {
			this.settings.reset(this.resetCategories);
		}
	}

}
