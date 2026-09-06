import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {IconDefinition} from '@fortawesome/free-solid-svg-icons';

/**
 * The card every settings section renders into: an icon-badged header with
 * the section name and the projected controls below. Sub-groups inside use
 * the global `.subsection-title` label; explanations use `<info-note>`.
 */
@Component({
	selector: 'settings-section',
	templateUrl: './SettingsSectionComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent],
	styles: [`
		:host {
			display: block;
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

}
