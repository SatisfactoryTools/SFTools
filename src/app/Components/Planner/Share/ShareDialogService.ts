import {Injectable, Signal, computed, signal} from '@angular/core';
import {Subscription} from 'rxjs';
import {ShareDialogTarget} from '@src/Components/Planner/Share/ShareDialogTarget';
import {ShareLinkKind} from '@src/Components/Planner/Share/ShareLinkKind';
import {AuthService} from '@src/Model/Auth/AuthService';
import {ClipboardService} from '@src/Model/ClipboardService';
import {AppPlatform} from '@src/Model/Desktop/AppPlatform';
import {PublicUrlService} from '@src/Model/Desktop/PublicUrlService';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {NotificationService} from '@src/Model/NotificationService';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanNameResolver} from '@src/Model/Planner/PlanNameResolver';
import {PlanStore} from '@src/Model/Planner/PlanStore';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';
import {ShareCreator} from '@src/Model/Shares/ShareCreator';

/**
 * Its own service because everything that can start a share lives somewhere else; the window itself is rendered once, by the planner.
 * The link is made and copied from here, inside the click that opened the share: WebKit refuses clipboard writes started later.
 */
@Injectable({providedIn: 'root'})
export class ShareDialogService
{

	private readonly targetSignal = signal<ShareDialogTarget | null>(null);
	public readonly target: Signal<ShareDialogTarget | null> = this.targetSignal.asReadonly();

	private readonly choiceSignal = signal<ShareLinkKind | null>(null);
	public readonly choice = this.choiceSignal.asReadonly();

	/** Only when the kind was picked in the window is there a way back to the other kind. */
	private readonly askedSignal = signal(false);
	public readonly asked = this.askedSignal.asReadonly();

	private readonly snapshotLinkSignal = signal<string | null>(null);

	private readonly creatingSignal = signal(false);
	public readonly creating = this.creatingSignal.asReadonly();

	private readonly errorSignal = signal<string | null>(null);
	public readonly error = this.errorSignal.asReadonly();

	private readonly copiedSignal = signal(false);
	public readonly copied = this.copiedSignal.asReadonly();

	private readonly copyFailedSignal = signal(false);

	/** Bumped on every open, choice and close, so answers to an abandoned request are dropped. */
	private generation = 0;
	private request: Subscription | null = null;
	private cancelRequest: (() => void) | null = null;

	public constructor(
		private readonly planManager: PlanManager,
		private readonly planNames: PlanNameResolver,
		private readonly settings: SettingsManager,
		private readonly authService: AuthService,
		private readonly versionManager: VersionManager,
		private readonly shareCreator: ShareCreator,
		private readonly publicUrls: PublicUrlService,
		private readonly clipboard: ClipboardService,
		private readonly notifications: NotificationService,
		private readonly platform: AppPlatform,
	)
	{
	}

	public readonly activeTarget: Signal<ShareDialogTarget | null> = computed(() => {
		const plan = this.planManager.activePlan();
		if (plan !== null) {
			if (this.planManager.isSharedPlan(plan.id)) {
				return null;
			}
			return {
				type: 'plan',
				id: plan.id,
				name: this.planNames.displayName(plan),
				device: this.planManager.isLocalPlan(plan.id),
			};
		}
		const folder = this.planManager.activeFolder();
		return folder === null ? null : {type: 'folder', id: folder.id, name: folder.name, device: false};
	});

	/**
	 * Opens only once there is something to show: a question, a problem, or the finished link when it is set to stay open.
	 * While a snapshot is being made only the Share buttons spin, so a window that would close at once never flashes up.
	 */
	public readonly windowVisible: Signal<boolean> = computed(() => this.targetSignal() !== null
		&& (this.askedSignal()
			|| this.copyFailedSignal()
			|| this.errorSignal() !== null
			|| (this.settings.planner().keepShareWindowOpen && !this.creatingSignal())));

	/** For the Share buttons' spinner: a link is on its way and nothing is shown yet. */
	public readonly working: Signal<boolean> = computed(() => this.creatingSignal() && !this.windowVisible());

	public readonly hasOwnLink: Signal<boolean> = computed(() => {
		const target = this.targetSignal();
		return target !== null && this.canSendLive(target);
	});

	public readonly link: Signal<string> = computed(() => {
		const target = this.targetSignal();
		switch (this.choiceSignal()) {
			case 'live':
				return target === null ? '' : this.ownLink(target);
			case 'snapshot':
				return this.snapshotLinkSignal() ?? '';
			default:
				return '';
		}
	});

	public openActive(): void
	{
		const target = this.activeTarget();
		if (target !== null) {
			this.open(target);
		}
	}

	public open(target: ShareDialogTarget): void
	{
		// A second press while the link is still being made would only start it again.
		if (this.working()) {
			return;
		}
		this.openLink(target);
		this.reset();
		this.targetSignal.set(target);

		const mode = this.settings.planner().shareLink;
		if (mode === 'ask') {
			this.askedSignal.set(true);
			return;
		}
		const live = mode === 'live' && this.canSendLive(target);
		this.choose(live ? 'live' : 'snapshot', mode === 'live' && !live);
	}

	public chooseSnapshot(): void
	{
		this.choose('snapshot', false);
	}

	public chooseLive(): void
	{
		this.choose('live', false);
	}

	public clearChoice(): void
	{
		this.copiedSignal.set(false);
		this.copyFailedSignal.set(false);
		this.choiceSignal.set(null);
	}

	public copyLink(): void
	{
		const link = this.link();
		if (link === '') {
			return;
		}
		void this.clipboard.copy(link).then(() => this.copiedSignal.set(true), () => undefined);
	}

	public close(): void
	{
		this.reset();
		this.targetSignal.set(null);
	}

	private choose(kind: ShareLinkKind, fellBack: boolean): void
	{
		const target = this.targetSignal();
		if (target === null) {
			return;
		}
		this.cancel();
		const generation = ++this.generation;
		this.copiedSignal.set(false);
		this.copyFailedSignal.set(false);
		this.errorSignal.set(null);
		this.choiceSignal.set(kind);

		if (kind === 'live') {
			this.deliver(generation, this.clipboard.copy(this.ownLink(target)), kind, fellBack);
			return;
		}
		const ready = this.snapshotLinkSignal();
		if (ready !== null) {
			this.deliver(generation, this.clipboard.copy(ready), kind, fellBack);
			return;
		}

		this.creatingSignal.set(true);
		const link = new Promise<string>((resolve, reject) => {
			this.cancelRequest = () => reject(new Error('cancelled'));
			this.request = this.shareCreator.create(target.type, target.id, this.storeOf(target), target.device).subscribe({next: resolve, error: reject});
		});
		const copied = this.clipboard.copyPending(link);
		copied.catch(() => undefined);
		link.then(
			value => {
				if (generation !== this.generation) return;
				this.request = null;
				this.cancelRequest = null;
				this.creatingSignal.set(false);
				this.snapshotLinkSignal.set(value);
				this.deliver(generation, copied, kind, fellBack);
			},
			// The API answers a rejected tree (too big, too deep) with a message meant for the user; it is shown above the two options.
			(err: {error?: {error?: string}; message?: string}) => {
				if (generation !== this.generation) return;
				this.request = null;
				this.cancelRequest = null;
				this.creatingSignal.set(false);
				this.choiceSignal.set(null);
				this.askedSignal.set(true);
				this.errorSignal.set(err?.error?.error ?? err?.message ?? 'Could not create the link.');
			},
		);
	}

	private deliver(generation: number, copy: Promise<void>, kind: ShareLinkKind, fellBack: boolean): void
	{
		copy.then(
			() => {
				if (generation !== this.generation) return;
				this.copiedSignal.set(true);
				if (!this.settings.planner().keepShareWindowOpen) {
					this.notifications.showSuccess(this.copiedMessage(kind, fellBack), 4000);
					this.close();
				}
			},
			() => {
				if (generation !== this.generation) return;
				// The window stays so the link can still be copied by hand.
				this.copyFailedSignal.set(true);
			},
		);
	}

	private copiedMessage(kind: ShareLinkKind, fellBack: boolean): string
	{
		if (kind === 'live') {
			return 'Link to the plan copied.';
		}
		if (!fellBack) {
			return 'Snapshot link copied.';
		}
		return this.targetSignal()?.type === 'folder'
			? 'Snapshot link copied. A folder can only be sent as a snapshot.'
			: `Snapshot link copied. This plan is saved only on ${this.platform.device}, so only a snapshot can be sent.`;
	}

	private canSendLive(target: ShareDialogTarget): boolean
	{
		return target.type === 'plan'
			&& !target.device
			&& this.authService.isAuthenticated()
			&& this.planManager.plans().some(plan => plan.id === target.id);
	}

	private ownLink(target: ShareDialogTarget): string
	{
		const version = this.versionManager.activeVersion();
		if (!version) {
			return '';
		}
		return this.publicUrls.url(`/${this.versionManager.urlSlug(version)}/planner/${target.id}`);
	}

	private storeOf(target: ShareDialogTarget): PlanStore
	{
		return target.device
			? {folders: this.planManager.localFolders(), plans: this.planManager.localPlans()}
			: {folders: this.planManager.folders(), plans: this.planManager.plans()};
	}

	private cancel(): void
	{
		this.generation++;
		this.request?.unsubscribe();
		this.request = null;
		this.cancelRequest?.();
		this.cancelRequest = null;
		this.creatingSignal.set(false);
	}

	private reset(): void
	{
		this.cancel();
		this.choiceSignal.set(null);
		this.askedSignal.set(false);
		this.snapshotLinkSignal.set(null);
		this.errorSignal.set(null);
		this.copiedSignal.set(false);
		this.copyFailedSignal.set(false);
	}

	/** A plan closed off by an older client would hand out a link that does not work, so sharing it opens it again. */
	private openLink(target: ShareDialogTarget): void
	{
		if (target.type === 'plan' && !target.device && this.planManager.findPlan(target.id)?.linkAccess === false) {
			this.planManager.setPlanLinkAccess(target.id, true);
		}
	}

}
