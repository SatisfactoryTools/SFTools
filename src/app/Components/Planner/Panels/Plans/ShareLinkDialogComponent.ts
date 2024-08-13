import {Component, ChangeDetectionStrategy, EventEmitter, Input, Output} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faCheck, faCopy} from '@fortawesome/free-solid-svg-icons';

/** Modal showing a freshly created share link with a copy-to-clipboard button. */
@Component({
	selector: 'share-link-dialog',
	templateUrl: './ShareLinkDialogComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent],
	styles: `
		.share-backdrop {
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.5);
			z-index: 1070;
			display: flex;
			align-items: center;
			justify-content: center;
		}
		.share-dialog {
			width: min(560px, calc(100vw - 2rem));
		}
	`,
})
export class ShareLinkDialogComponent
{

	@Input({required: true}) public link = '';
	@Input({required: true}) public subjectName = '';
	@Output() public readonly close = new EventEmitter<void>();

	public readonly faCheck = faCheck;
	public readonly faCopy = faCopy;

	public copied = false;

	public copy(): void
	{
		void navigator.clipboard.writeText(this.link).then(() => {
			this.copied = true;
		});
	}

}
