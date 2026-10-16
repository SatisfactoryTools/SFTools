import {Component, ChangeDetectionStrategy, HostListener, effect, signal, untracked} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faHeart} from '@fortawesome/free-solid-svg-icons';
import {HotkeyBlockDirective} from '@src/Components/Common/HotkeyBlockDirective';
import {AccountProfileService} from '@src/Model/Auth/AccountProfileService';
import {SupporterWelcomeService} from '@src/Model/Supporters/SupporterWelcomeService';

@Component({
	selector: 'supporter-welcome-dialog',
	templateUrl: './SupporterWelcomeDialogComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, FormsModule, RouterLink, HotkeyBlockDirective],
	styles: [`
		.welcome-backdrop {
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.6);
			z-index: 1070;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 1rem;
		}
		.welcome-dialog {
			position: relative;
			width: min(460px, 100%);
			max-height: 92vh;
			overflow-y: auto;
			box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.5);
		}
		.welcome-hero {
			padding: 1.75rem 1.5rem 0.5rem;
			text-align: center;
			background: radial-gradient(ellipse 70% 60% at 50% 0%, rgba(232, 184, 63, 0.25), transparent 70%);
		}
		.welcome-heart {
			font-size: 2.25rem;
			color: #e8b83f;
			margin-bottom: 0.5rem;
			filter: drop-shadow(0 4px 12px rgba(232, 184, 63, 0.4));
		}
		.welcome-close {
			position: absolute;
			top: 0.75rem;
			right: 0.75rem;
		}
		.card-body {
			padding: 0.75rem 1.5rem 1.25rem;
		}
	`],
})
export class SupporterWelcomeDialogComponent
{

	public readonly faHeart = faHeart;

	public listed = true;

	public listName = '';

	private readonly savingSignal = signal(false);
	public readonly saving = this.savingSignal.asReadonly();

	private readonly errorSignal = signal<string | null>(null);
	public readonly error = this.errorSignal.asReadonly();

	public constructor(
		protected readonly welcome: SupporterWelcomeService,
		account: AccountProfileService,
	)
	{
		effect(() => {
			if (this.welcome.visible()) {
				untracked(() => {
					this.listName = account.supporter()?.listName ?? account.name() ?? '';
				});
			}
		});
	}

	public get canSave(): boolean
	{
		return !this.saving() && (!this.listed || this.listName.trim() !== '');
	}

	public save(): void
	{
		if (!this.canSave) {
			return;
		}
		this.savingSignal.set(true);
		this.errorSignal.set(null);
		this.welcome.save(this.listed ? this.listName.trim() : null).subscribe({
			next: () => {
				this.savingSignal.set(false);
				this.welcome.close();
			},
			error: () => {
				this.savingSignal.set(false);
				this.errorSignal.set('Could not save. Please try again.');
			},
		});
	}

	@HostListener('document:keydown.escape')
	public onEscape(): void
	{
		if (this.welcome.visible()) {
			this.welcome.dismiss();
		}
	}

}
