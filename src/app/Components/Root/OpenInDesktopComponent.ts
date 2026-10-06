import {Component, ChangeDetectionStrategy} from '@angular/core';
import {WebLinkHandoffService} from '@src/Model/Desktop/WebLinkHandoffService';

@Component({
	selector: 'open-in-desktop',
	templateUrl: './OpenInDesktopComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	styles: [`
		.handoff {
			position: fixed;
			inset: 0;
			z-index: 1060;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 1rem;
			background: rgba(15, 37, 55, 0.92);
		}
		.handoff-card {
			max-width: 440px;
			background: #20374c;
			padding: 1.5rem 1.75rem;
			box-shadow: 0 .5rem 1rem rgba(0, 0, 0, .3);
		}
	`],
})
export class OpenInDesktopComponent
{

	public constructor(protected readonly handoff: WebLinkHandoffService)
	{
		// Straight away: the browser asks before it starts the app anyway.
		handoff.openInApp();
	}

}
