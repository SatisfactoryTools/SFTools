import {Component, ChangeDetectionStrategy, HostBinding, Input} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {IconDefinition, faCircleInfo, faTriangleExclamation} from '@fortawesome/free-solid-svg-icons';
import {InfoNoteKind} from '@src/Components/Common/InfoNoteKind';

/**
 * The one style for "how this works" text across the app: a quiet tinted box
 * with an icon in front of the projected content. `info` explains, `warning`
 * points out a consequence the user should know about before continuing.
 */
@Component({
	selector: 'info-note',
	templateUrl: './InfoNoteComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent],
	styles: [`
		:host {
			display: flex;
			align-items: flex-start;
			gap: 0.5rem;
			padding: 0.4rem 0.6rem;
			font-size: 0.875rem;
			line-height: 1.4;
			color: #c5d0db;
			background: rgba(91, 192, 222, 0.1);
			border-left: 3px solid #5bc0de;
		}
		:host(.warning) {
			color: #e9dcb8;
			background: rgba(240, 173, 78, 0.12);
			border-left-color: #f0ad4e;
		}
		.note-icon {
			flex-shrink: 0;
			margin-top: 0.15em;
			color: #5bc0de;
		}
		:host(.warning) .note-icon {
			color: #f0ad4e;
		}
		.note-body {
			flex-grow: 1;
			min-width: 0;
		}
	`],
})
export class InfoNoteComponent
{

	@Input() public kind: InfoNoteKind = 'info';

	@HostBinding('class.warning')
	public get isWarning(): boolean
	{
		return this.kind === 'warning';
	}

	public get icon(): IconDefinition
	{
		return this.kind === 'warning' ? faTriangleExclamation : faCircleInfo;
	}

}
