import {Component, ChangeDetectionStrategy, Input} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {IconDefinition} from '@fortawesome/free-solid-svg-icons';
import {HelpButtonComponent} from '@src/Components/Help/HelpButtonComponent';
import {HelpTopicId} from '@src/Model/Help/HelpTopicId';

/**
 * The card every settings section renders into: an icon-badged header with
 * the section name and the projected controls below. Sub-groups inside use
 * the global `.subsection-title` label; explanations use `<info-note>`.
 *
 * A section may name the help topic that explains it; the question mark then
 * appears in the header as soon as an article claims that topic.
 */
@Component({
	selector: 'settings-section',
	templateUrl: './SettingsSectionComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, HelpButtonComponent],
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

	/** Help topic for the header's question-mark button; empty for none. */
	@Input() public helpTopic: HelpTopicId | '' = '';

}
