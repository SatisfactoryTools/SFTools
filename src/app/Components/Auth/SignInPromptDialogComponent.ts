import {Component, ChangeDetectionStrategy, HostListener} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faCloudArrowUp, faPuzzlePiece, faShareNodes} from '@fortawesome/free-solid-svg-icons';
import {OAuthProviderButtonsComponent} from '@src/Components/Auth/OAuthProviderButtonsComponent';
import {SignInPromptService} from '@src/Model/Auth/SignInPromptService';

/**
 * The sign-in nudge shown over the planner to signed-out users (see
 * SignInPromptService for when): what an account buys them, the provider
 * buttons right there, and two ways out - continue without an account for
 * now, or turn the reminders off for good.
 */
@Component({
	selector: 'sign-in-prompt-dialog',
	templateUrl: './SignInPromptDialogComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, RouterLink, OAuthProviderButtonsComponent],
	styles: [`
		.prompt-backdrop {
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.6);
			z-index: 1070;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 1rem;
		}
		.prompt-dialog {
			position: relative;
			width: min(460px, 100%);
			max-height: 92vh;
			overflow-y: auto;
			box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.5);
		}
		.prompt-hero {
			padding: 1.75rem 1.5rem 0.5rem;
			text-align: center;
			background: radial-gradient(ellipse 70% 60% at 50% 0%, rgba(76, 155, 232, 0.22), transparent 70%);
		}
		.prompt-hero img {
			height: 48px;
			margin-bottom: 0.75rem;
			filter: drop-shadow(0 4px 12px rgba(76, 155, 232, 0.35));
		}
		.prompt-close {
			position: absolute;
			top: 0.75rem;
			right: 0.75rem;
		}
		.benefits {
			list-style: none;
			padding: 0;
			margin: 0 0 1.25rem;
			display: flex;
			flex-direction: column;
			gap: 0.5rem;
			font-size: 0.9rem;
		}
		.benefits li {
			display: flex;
			align-items: flex-start;
			gap: 0.75rem;
		}
		.benefit-icon {
			flex-shrink: 0;
			width: 1.75rem;
			height: 1.75rem;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			background: rgba(76, 155, 232, 0.15);
			color: #4c9be8;
		}
		.card-body {
			padding: 0.75rem 1.5rem 1.25rem;
		}
	`],
})
export class SignInPromptDialogComponent
{

	public readonly faCloudArrowUp = faCloudArrowUp;
	public readonly faShareNodes = faShareNodes;
	public readonly faPuzzlePiece = faPuzzlePiece;

	public constructor(
		protected readonly signInPrompt: SignInPromptService,
		private readonly router: Router,
	)
	{
	}

	/** After signing in the user should land back on the page the prompt interrupted. */
	public get returnUrl(): string
	{
		return this.router.url;
	}

	@HostListener('document:keydown.escape')
	public onEscape(): void
	{
		if (this.signInPrompt.visible()) {
			this.signInPrompt.continueWithout();
		}
	}

}
