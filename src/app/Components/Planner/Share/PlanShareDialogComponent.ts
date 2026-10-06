import {Component, ChangeDetectionStrategy, HostListener, Input, computed, signal} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faArrowLeft, faCamera, faCheck, faCopy, faLink} from '@fortawesome/free-solid-svg-icons';
import {HotkeyBlockDirective} from '@src/Components/Common/HotkeyBlockDirective';
import {HelpButtonComponent} from '@src/Components/Help/HelpButtonComponent';
import {ShareDialogService} from '@src/Components/Planner/Share/ShareDialogService';
import {ShareDialogTarget} from '@src/Components/Planner/Share/ShareDialogTarget';
import {ShareLinkKind} from '@src/Components/Planner/Share/ShareLinkKind';
import {AuthService} from '@src/Model/Auth/AuthService';
import {PublicUrlService} from '@src/Model/Desktop/PublicUrlService';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanStore} from '@src/Model/Planner/PlanStore';
import {ShareCreator} from '@src/Model/Shares/ShareCreator';
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
			border-radius: 0.375rem;
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

	/** A signal, so the computed links follow a target swapped while the window stays open. */
	private readonly targetSignal = signal<ShareDialogTarget | null>(null);
	public readonly target = this.targetSignal.asReadonly();

	@Input({required: true}) public set shareTarget(target: ShareDialogTarget)
	{
		this.targetSignal.set(target);
		this.choiceSignal.set(null);
		this.snapshotLinkSignal.set(null);
		this.errorSignal.set(null);
		this.copied = false;
	}

	public readonly faArrowLeft = faArrowLeft;
	public readonly faCamera = faCamera;
	public readonly faCheck = faCheck;
	public readonly faCopy = faCopy;
	public readonly faLink = faLink;

	private readonly choiceSignal = signal<ShareLinkKind | null>(null);
	public readonly choice = this.choiceSignal.asReadonly();

	private readonly snapshotLinkSignal = signal<string | null>(null);

	private readonly creatingSignal = signal(false);
	public readonly creating = this.creatingSignal.asReadonly();

	private readonly errorSignal = signal<string | null>(null);
	public readonly error = this.errorSignal.asReadonly();

	public copied = false;

	public constructor(
		private readonly dialog: ShareDialogService,
		protected readonly platform: AppPlatform,
		private readonly planManager: PlanManager,
		private readonly versionManager: VersionManager,
		private readonly authService: AuthService,
		private readonly shareCreator: ShareCreator,
		private readonly publicUrls: PublicUrlService,
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

	public readonly hasOwnLink = computed(() => {
		const target = this.targetSignal();
		return target !== null
			&& target.type === 'plan'
			&& !target.device
			&& this.authService.isAuthenticated()
			&& this.planManager.plans().some(plan => plan.id === target.id);
	});

	public readonly ownLink = computed(() => {
		const target = this.targetSignal();
		const version = this.versionManager.activeVersion();
		if (target === null || !version) {
			return '';
		}
		return this.publicUrls.url(`/${this.versionManager.urlSlug(version)}/planner/${target.id}`);
	});

	public readonly link = computed(() => {
		switch (this.choiceSignal()) {
			case 'live':
				return this.ownLink();
			case 'snapshot':
				return this.snapshotLinkSignal() ?? '';
			default:
				return '';
		}
	});

	public chooseSnapshot(): void
	{
		this.copied = false;
		this.errorSignal.set(null);
		if (this.snapshotLinkSignal() !== null) {
			this.choiceSignal.set('snapshot');
			return;
		}
		const target = this.targetSignal();
		if (target === null) {
			return;
		}
		this.choiceSignal.set('snapshot');
		this.creatingSignal.set(true);
		this.shareCreator.create(target.type, target.id, this.store, target.device).subscribe({
			next: link => {
				this.creatingSignal.set(false);
				this.snapshotLinkSignal.set(link);
			},
			// The API answers a rejected tree (too big, too deep) with a message meant for the user; it is shown above the two options.
			error: (err: {error?: {error?: string}; message?: string}) => {
				this.creatingSignal.set(false);
				this.choiceSignal.set(null);
				this.errorSignal.set(err?.error?.error ?? err?.message ?? 'Could not create the link.');
			},
		});
	}

	public chooseLive(): void
	{
		this.copied = false;
		this.errorSignal.set(null);
		this.choiceSignal.set('live');
	}

	public clearChoice(): void
	{
		this.copied = false;
		this.choiceSignal.set(null);
	}

	public copyLink(): void
	{
		const link = this.link();
		if (link === '') {
			return;
		}
		void navigator.clipboard.writeText(link).then(() => {
			this.copied = true;
		});
	}

	private get store(): PlanStore
	{
		return this.targetSignal()?.device === true
			? {folders: this.planManager.localFolders(), plans: this.planManager.localPlans()}
			: {folders: this.planManager.folders(), plans: this.planManager.plans()};
	}

}
