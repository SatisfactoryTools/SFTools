import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faXmark} from '@fortawesome/free-solid-svg-icons';
import {DesktopUpdateService} from '@src/Model/Desktop/DesktopUpdateService';

@Component({
	selector: 'desktop-update-banner',
	templateUrl: './DesktopUpdateBannerComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent],
	styles: [`
		.update-banner {
			position: fixed;
			right: 1rem;
			bottom: 1rem;
			z-index: 1055;
			width: min(360px, calc(100vw - 2rem));
		}
		.notes {
			white-space: pre-line;
			max-height: 8rem;
			overflow-y: auto;
		}
	`],
})
export class DesktopUpdateBannerComponent
{

	public readonly faXmark = faXmark;

	public constructor(protected readonly updates: DesktopUpdateService)
	{
	}

	public percent(progress: number | null | undefined): string
	{
		return progress === null || progress === undefined ? '' : ` ${Math.round(progress * 100)} %`;
	}

}
