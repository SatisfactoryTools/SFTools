import {Component, ChangeDetectionStrategy, HostListener} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faArrowLeft, faCamera, faCheck, faCopy, faLink} from '@fortawesome/free-solid-svg-icons';
import {HotkeyBlockDirective} from '@src/Components/Common/HotkeyBlockDirective';
import {HelpButtonComponent} from '@src/Components/Help/HelpButtonComponent';
import {ShareDialogService} from '@src/Components/Planner/Share/ShareDialogService';
import {AppPlatform} from '@src/Model/Desktop/AppPlatform';

/** Only the picked kind of link is shown: showing both at once meant people copied whichever box was already filled in instead of choosing. */
@Component({
	selector: 'plan-share-dialog',
	templateUrl: './PlanShareDialogComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, HotkeyBlockDirective, HelpButtonComponent],
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
		.share-option {
			display: block;
			width: 100%;
			text-align: left;
			padding: 0.65rem 0.8rem;
			border: 1px solid rgba(255, 255, 255, 0.15);
			background: rgba(255, 255, 255, 0.03);
			color: inherit;
			transition: background 0.15s, border-color 0.15s;
		}
		.share-option:hover:not(:disabled) {
			background: rgba(255, 255, 255, 0.08);
			border-color: rgba(255, 255, 255, 0.35);
		}
		.share-option:disabled {
			opacity: 0.6;
			cursor: default;
		}
	`,
})
export class PlanShareDialogComponent
{

	public readonly faArrowLeft = faArrowLeft;
	public readonly faCamera = faCamera;
	public readonly faCheck = faCheck;
	public readonly faCopy = faCopy;
	public readonly faLink = faLink;

	public constructor(
		public readonly dialog: ShareDialogService,
		protected readonly platform: AppPlatform,
	)
	{
	}

	@HostListener('document:keydown.escape')
	public onEscape(): void
	{
		this.close();
	}

	public close(): void
	{
		this.dialog.close();
	}

}
