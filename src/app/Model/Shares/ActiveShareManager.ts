import {Injectable, Signal, computed, signal} from '@angular/core';
import {Router} from '@angular/router';
import {Observable, of} from 'rxjs';
import {catchError, filter, map, switchMap, take, tap, timeout} from 'rxjs/operators';
import {SharesApiService} from '@src/Model/API/SharesApiService';
import {VersionsApiService} from '@src/Model/API/VersionsApiService';
import {SharedFolderNode} from '@src/Model/API/Schema/Shares/SharedFolderNode';
import {SharedPlanNode} from '@src/Model/API/Schema/Shares/SharedPlanNode';
import {SharePayload} from '@src/Model/API/Schema/Shares/SharePayload';
import {AuthService} from '@src/Model/Auth/AuthService';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {NotificationService} from '@src/Model/NotificationService';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanTreeFolder} from '@src/Model/Planner/PlanTreeFolder';
import {PlanTreePlan} from '@src/Model/Planner/PlanTreePlan';
import {ShareHydration} from '@src/Model/Shares/ShareHydration';
import {ShareImportService} from '@src/Model/Shares/ShareImportService';
import {ShareTreeCache} from '@src/Model/Shares/ShareTreeCache';
import {SharePayloadHydrator} from '@src/Model/Shares/SharePayloadHydrator';
import {VisitedSharesManager} from '@src/Model/Shares/VisitedSharesManager';

/**
 * The share currently open in the planner (read-only mode). Owns the whole
 * share lifecycle: fetching the payload, silently adding its game version to
 * the viewer's list, recording the visit, hydrating the tree into
 * PlanManager's read-only shared store, and the "Add to my plans" move.
 */
@Injectable({providedIn: 'root'})
export class ActiveShareManager
{

	private readonly shareIdSignal = signal<string | null>(null);
	public readonly shareId: Signal<string | null> = this.shareIdSignal.asReadonly();

	private readonly payloadSignal = signal<SharePayload | null>(null);
	public readonly payload: Signal<SharePayload | null> = this.payloadSignal.asReadonly();

	private readonly hydrationSignal = signal<ShareHydration | null>(null);

	private readonly loadErrorSignal = signal<string | null>(null);
	public readonly loadError: Signal<string | null> = this.loadErrorSignal.asReadonly();

	/** True while a share is open (payload loaded) - drives the planner's read-only surfaces. */
	public readonly active: Signal<boolean> = computed(() => this.payloadSignal() !== null);

	/** The last successfully fetched share, so redirect → planner does not fetch twice. */
	private cachedPayload: {shareId: string; payload: SharePayload} | null = null;

	/** A plan (by its payload id) chosen from the list before its share was open - selected once hydrated. */
	private pendingPlan: {shareId: string; payloadPlanId: string} | null = null;

	/** The hydrated root plan of an open plan share (null for folder shares or while closed). */
	public readonly rootPlan: Signal<Plan | null> = computed(() => {
		const payload = this.payloadSignal();
		const hydration = this.hydrationSignal();
		if (payload === null || hydration === null || payload.type !== 'plan') {
			return null;
		}
		const id = hydration.idMap.get(payload.root.id);
		return hydration.plans.find(plan => plan.id === id) ?? null;
	});

	public constructor(
		private readonly sharesApi: SharesApiService,
		private readonly versionsApi: VersionsApiService,
		private readonly versionManager: VersionManager,
		private readonly visitedShares: VisitedSharesManager,
		private readonly hydrator: SharePayloadHydrator,
		private readonly shareImport: ShareImportService,
		private readonly shareTrees: ShareTreeCache,
		private readonly planManager: PlanManager,
		private readonly authService: AuthService,
		private readonly notifications: NotificationService,
		private readonly router: Router,
	)
	{
	}

	/**
	 * Fetches the share, makes sure its version is in the viewer's list and
	 * records the visit - everything the redirect entry needs before it can
	 * navigate into the version context. Cached per share id, so the planner
	 * route reuses the result instead of fetching again.
	 */
	public prepare(shareId: string): Observable<SharePayload>
	{
		if (this.cachedPayload?.shareId === shareId) {
			return of(this.cachedPayload.payload);
		}
		return this.sharesApi.getShare(shareId).pipe(
			switchMap(payload => this.ensureVersion(payload).pipe(map(() => payload))),
			tap(payload => {
				this.cachedPayload = {shareId, payload};
				this.shareTrees.record(payload);
				this.visitedShares.recordVisit(payload);
			}),
		);
	}

	/** Activates the share in the planner: hydrates its tree read-only and selects the first plan. */
	public open(shareId: string): void
	{
		if (this.shareIdSignal() === shareId && this.payloadSignal() !== null) {
			return;
		}
		this.shareIdSignal.set(shareId);
		this.loadErrorSignal.set(null);
		this.prepare(shareId).subscribe({
			next: payload => {
				// The user may have navigated elsewhere while the fetch ran.
				if (this.shareIdSignal() !== shareId) {
					return;
				}
				const hydration = this.hydrator.hydrate(payload);
				this.planManager.loadSharedStore(hydration.folders, hydration.plans);
				this.hydrationSignal.set(hydration);
				this.payloadSignal.set(payload);
				const pending = this.pendingPlan?.shareId === shareId ? hydration.idMap.get(this.pendingPlan.payloadPlanId) ?? null : null;
				this.pendingPlan = null;
				const first = pending ?? this.rootPlan()?.id ?? this.firstPlanOf(this.planManager.sharedPlanTree().entries)?.id ?? null;
				if (first !== null) {
					this.planManager.setActivePlan(first);
				}
			},
			error: () => {
				this.loadErrorSignal.set('This share does not exist (or the link is malformed).');
				this.notifications.show('Could not load the shared plan.');
			},
		});
	}

	/** The hydrated id of a payload plan of the open share, or null while the share is not open. */
	public hydratedPlanId(payloadPlanId: string): string | null
	{
		return this.hydrationSignal()?.idMap.get(payloadPlanId) ?? null;
	}

	/** The payload id of the open share's plan that is currently selected, or null. */
	public activePayloadPlanId(): string | null
	{
		const activeId = this.planManager.activePlanId();
		let result: string | null = null;
		this.hydrationSignal()?.idMap.forEach((hydratedId, payloadId) => {
			if (hydratedId === activeId) {
				result = payloadId;
			}
		});
		return result;
	}

	/**
	 * Selects a plan of a share by its payload id: right away when that share
	 * is open, otherwise once the share (which the caller navigates to) has
	 * been hydrated.
	 */
	public selectPlan(shareId: string, payloadPlanId: string): void
	{
		const hydrated = this.shareIdSignal() === shareId ? this.hydratedPlanId(payloadPlanId) : null;
		if (hydrated !== null) {
			this.planManager.setActivePlan(hydrated);
			return;
		}
		this.pendingPlan = {shareId, payloadPlanId};
	}

	/** Leaves share mode; the cached payload stays so reopening is instant. */
	public close(): void
	{
		if (this.shareIdSignal() === null) {
			return;
		}
		this.shareIdSignal.set(null);
		this.payloadSignal.set(null);
		this.hydrationSignal.set(null);
		this.loadErrorSignal.set(null);
		this.planManager.clearSharedStore();
	}

	/**
	 * Plans are version-scoped, so a share can only be copied into the plans
	 * of its own game version. True while that version is active - a drop
	 * target in the current tree makes sense only then; addToMyPlans itself
	 * switches versions when needed.
	 */
	public isShareVersionActive(shareVersionId: string): boolean
	{
		return this.versionManager.activeVersion()?.id === shareVersionId;
	}

	/**
	 * The "move" to the viewer's own plans: copies the whole share (fresh
	 * ids) into the given folder (null = top level) and drops the visited-list
	 * entry. Works for any visited share, open or not (the payload is fetched
	 * when needed), and for anonymous users too - their plans live in
	 * localStorage. When the share is the one open in the planner, the copy
	 * of whichever shared plan is on screen is opened, which leaves share mode.
	 */
	public addToMyPlans(shareId: string, folderId: string | null = null): void
	{
		this.prepare(shareId).subscribe({
			next: payload => {
				if (!this.isShareVersionActive(payload.version.id)) {
					this.addAfterVersionSwitch(payload);
					return;
				}
				const open = this.shareIdSignal() === shareId ? this.hydrationSignal() : null;

				// The viewed shared plan's payload id, so the copy of that exact plan can be opened.
				const activeId = this.planManager.activePlanId();
				let activePayloadId: string | null = null;
				open?.idMap.forEach((ephemeralId, payloadId) => {
					if (ephemeralId === activeId) {
						activePayloadId = payloadId;
					}
				});

				const importMap = this.shareImport.import(payload, folderId);
				this.visitedShares.remove(payload.share);
				this.notifications.showSuccess('Added to your plans.');

				if (open === null) {
					return;
				}
				const version = this.versionManager.versions().find(v => v.id === payload.version.id);
				if (!version) {
					return;
				}
				const slug = this.versionManager.urlSlug(version);
				const targetId = activePayloadId !== null ? importMap.get(activePayloadId) ?? null : null;
				void this.router.navigate(targetId !== null ? ['/', slug, 'planner', targetId] : ['/', slug, 'planner']);
			},
			error: () => this.notifications.show('Could not load the shared plan.'),
		});
	}

	/** A folder share opens on its first plan in display order (the order the panel lists the tree in). */
	private firstPlanOf(entries: (PlanTreeFolder | PlanTreePlan)[]): Plan | null
	{
		for (const entry of entries) {
			const plan = 'folder' in entry ? this.firstPlanOf(entry.entries) : entry.plan;
			if (plan !== null) {
				return plan;
			}
		}
		return null;
	}

	/**
	 * A share of another game version: switch the planner to that version
	 * (prepare() already made sure it is in the viewer's list), wait until
	 * the plan store has reloaded for it, then copy the share in at the top
	 * level and open the copy. Importing before the reload settles would be
	 * overwritten by it.
	 */
	private addAfterVersionSwitch(payload: SharePayload): void
	{
		const version = this.versionManager.versions().find(v => v.id === payload.version.id);
		if (!version) {
			this.notifications.show('The game version this share was made for is no longer available.');
			return;
		}
		const slug = this.versionManager.urlSlug(version);
		this.planManager.storeLoaded.pipe(
			filter(versionId => versionId === version.id),
			take(1),
			timeout(15000),
		).subscribe({
			next: () => {
				const importMap = this.shareImport.import(payload, null);
				this.visitedShares.remove(payload.share);
				this.notifications.showSuccess(`Added to your plans in ${version.name}.`);
				const rootId = payload.type === 'plan' ? importMap.get(payload.root.id) ?? null : null;
				void this.router.navigate(rootId !== null ? ['/', slug, 'planner', rootId] : ['/', slug, 'planner']);
			},
			error: () => this.notifications.show(`Could not switch to ${version.name} - the shared plan was not added.`),
		});
		void this.router.navigate(['/', slug, 'planner']);
	}

	/**
	 * Silently adds the share's version to the viewer's list when missing
	 * (versions are shared, deduplicated objects - this is just a link).
	 * Authenticated viewers get a server-side link first; either way the
	 * version becomes usable immediately via registerCreatedVersion.
	 */
	private ensureVersion(payload: SharePayload): Observable<void>
	{
		if (this.versionManager.versions().some(v => v.id === payload.version.id)) {
			return of(void 0);
		}
		return this.versionsApi.getVersion(payload.version.id).pipe(
			switchMap(version => {
				if (!this.authService.isAuthenticated()) {
					return of(version);
				}
				// A failed link is tolerated - the version still works this
				// session, and reopening the share retries the link.
				return this.versionsApi.linkVersions([version.id]).pipe(
					catchError(() => of(null)),
					map(() => version),
				);
			}),
			tap(version => this.versionManager.registerCreatedVersion(version)),
			map(() => void 0),
		);
	}

}
