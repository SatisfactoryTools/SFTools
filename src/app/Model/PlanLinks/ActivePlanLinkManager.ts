import {Injectable, Signal, computed, signal} from '@angular/core';
import {Router} from '@angular/router';
import {map, switchMap} from 'rxjs/operators';
import {PlansApiService} from '@src/Model/API/PlansApiService';
import {PlanLinkPayload} from '@src/Model/API/Schema/Plans/PlanLinkPayload';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {NotificationService} from '@src/Model/NotificationService';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {ShareImportService} from '@src/Model/Shares/ShareImportService';
import {SharePayloadHydrator} from '@src/Model/Shares/SharePayloadHydrator';
import {ShareVersionLinker} from '@src/Model/Shares/ShareVersionLinker';

/**
 * Someone else's plan, opened read-only from the plan's own URL. People copy the
 * address bar instead of making a share link all the time, so a plan id in the URL that
 * the viewer does not own is looked up through the public plan endpoint: when its owner
 * left link access on, the plan opens here exactly like a share does.
 *
 * The plan is hydrated into PlanManager's read-only shared store (under its original
 * ids - see SharePayloadHydrator.hydrateLivePlan), which is what puts the whole planner
 * into read-only mode. Nothing is recorded in the visited list: unlike a share this is
 * a live plan that its owner can change or close off at any time.
 */
@Injectable({providedIn: 'root'})
export class ActivePlanLinkManager
{

	private readonly payloadSignal = signal<PlanLinkPayload | null>(null);
	public readonly payload: Signal<PlanLinkPayload | null> = this.payloadSignal.asReadonly();

	/** True once a link the viewer followed turned out not to be openable (see the dialog). */
	private readonly unavailableSignal = signal<boolean>(false);
	public readonly unavailable: Signal<boolean> = this.unavailableSignal.asReadonly();

	/** True while a plan opened by link is on screen. */
	public readonly active: Signal<boolean> = computed(() => this.payloadSignal() !== null);

	/** The plan id currently being opened or open - also the id the URL carries. */
	private planId: string | null = null;

	/** Ids that turned out not to be openable, so a repeating store emission cannot re-fetch them. */
	private readonly failed = new Set<string>();

	public constructor(
		private readonly plansApi: PlansApiService,
		private readonly versionLinker: ShareVersionLinker,
		private readonly versionManager: VersionManager,
		private readonly hydrator: SharePayloadHydrator,
		private readonly shareImport: ShareImportService,
		private readonly planManager: PlanManager,
		private readonly notifications: NotificationService,
		private readonly router: Router,
	)
	{
	}

	/**
	 * Opens the plan the URL names, after the planner has established it is none of the
	 * viewer's own. The caller re-runs on every store emission, so an id that already
	 * failed is never fetched twice; one that opened is refetched when it is opened
	 * again later, which is the point of a live link.
	 */
	public open(planId: string): void
	{
		if (this.planId === planId || this.failed.has(planId)) {
			return;
		}
		this.planId = planId;
		this.unavailableSignal.set(false);

		this.plansApi.getPlanByLink(planId).pipe(
			switchMap(payload => this.versionLinker.ensure(payload.version.id).pipe(map(() => payload))),
		).subscribe({
			next: payload => {
				// The viewer may have moved on while the fetch ran.
				if (this.planId !== planId) {
					return;
				}
				const hydration = this.hydrator.hydrateLivePlan(payload.root);
				this.planManager.loadSharedStore([], hydration.plans);
				this.payloadSignal.set(payload);
				this.planManager.setActivePlan(planId);
				this.goToOwnVersion(payload);
			},
			error: () => {
				if (this.planId !== planId) {
					return;
				}
				this.planId = null;
				this.failed.add(planId);
				this.unavailableSignal.set(true);
			},
		});
	}

	/** Leaves the link view - the viewer navigated to a plan of their own, or away. */
	public close(): void
	{
		this.unavailableSignal.set(false);
		if (this.planId === null) {
			return;
		}
		this.planId = null;
		this.payloadSignal.set(null);
		this.planManager.clearSharedStore();
	}

	/** Dismisses the "this link does not open here" dialog. */
	public dismissUnavailable(): void
	{
		this.unavailableSignal.set(false);
	}

	/** The plan on screen, as hydrated into the read-only store. */
	public plan(): Plan | null
	{
		return this.planId === null ? null : this.planManager.findPlan(this.planId);
	}

	/**
	 * Copies the plan (with its subplans) into the viewer's own plans under fresh ids
	 * and opens the copy, which leaves the link view. Signed out that copy lives in this
	 * browser, exactly like a copy of a share.
	 */
	public addToMyPlans(): void
	{
		const payload = this.payloadSignal();
		if (payload === null) {
			return;
		}
		const copyId = this.shareImport.importPlanNode(payload.root, null);
		this.notifications.showSuccess('Added to your plans.');
		this.planManager.setActivePlan(copyId);
	}

	/**
	 * A plan link pasted with the wrong version slug (or none of the viewer's) still
	 * names one plan; put the address bar on the version the plan actually belongs to,
	 * so reloading and copying the link keep working.
	 */
	private goToOwnVersion(payload: PlanLinkPayload): void
	{
		const active = this.versionManager.activeVersion();
		if (active !== null && active.id === payload.version.id) {
			return;
		}
		const version = this.versionManager.versions().find(v => v.id === payload.version.id);
		if (!version) {
			return;
		}
		void this.router.navigate(['/', this.versionManager.urlSlug(version), 'planner', payload.plan]);
	}

}
