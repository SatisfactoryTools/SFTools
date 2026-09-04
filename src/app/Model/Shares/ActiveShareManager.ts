import {Injectable, Signal, computed, signal} from '@angular/core';
import {Router} from '@angular/router';
import {Observable, of} from 'rxjs';
import {catchError, map, switchMap, tap} from 'rxjs/operators';
import {SharesApiService} from '@src/Model/API/SharesApiService';
import {VersionsApiService} from '@src/Model/API/VersionsApiService';
import {SharedFolderNode} from '@src/Model/API/Schema/Shares/SharedFolderNode';
import {SharedPlanNode} from '@src/Model/API/Schema/Shares/SharedPlanNode';
import {SharePayload} from '@src/Model/API/Schema/Shares/SharePayload';
import {AuthService} from '@src/Model/Auth/AuthService';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {NotificationService} from '@src/Model/NotificationService';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {ActiveShareTreeRow} from '@src/Model/Shares/ActiveShareTreeRow';
import {ShareHydration} from '@src/Model/Shares/ShareHydration';
import {ShareImportService} from '@src/Model/Shares/ShareImportService';
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

	public readonly treeRows: Signal<ActiveShareTreeRow[]> = computed(() => {
		const payload = this.payloadSignal();
		const hydration = this.hydrationSignal();
		if (payload === null || hydration === null) {
			return [];
		}
		const planById = new Map(hydration.plans.map(plan => [plan.id, plan]));
		const rows: ActiveShareTreeRow[] = [];
		const addPlan = (node: SharedPlanNode, depth: number): void => {
			rows.push({kind: 'plan', depth, name: node.name, plan: planById.get(hydration.idMap.get(node.id)!) ?? null});
			node.subplans.forEach(sub => addPlan(sub, depth + 1));
		};
		const addFolder = (node: SharedFolderNode, depth: number): void => {
			rows.push({kind: 'folder', depth, name: node.name, plan: null});
			node.children.forEach(child => addFolder(child, depth + 1));
			node.plans.forEach(plan => addPlan(plan, depth + 1));
		};
		if (payload.type === 'folder') {
			addFolder(payload.root as SharedFolderNode, 0);
		} else {
			addPlan(payload.root as SharedPlanNode, 0);
		}
		return rows;
	});

	public constructor(
		private readonly sharesApi: SharesApiService,
		private readonly versionsApi: VersionsApiService,
		private readonly versionManager: VersionManager,
		private readonly visitedShares: VisitedSharesManager,
		private readonly hydrator: SharePayloadHydrator,
		private readonly shareImport: ShareImportService,
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
				const first = this.treeRows().find(row => row.plan !== null)?.plan ?? null;
				if (first !== null) {
					this.planManager.setActivePlan(first.id);
				}
			},
			error: () => {
				this.loadErrorSignal.set('This share does not exist (or the link is malformed).');
				this.notifications.show('Could not load the shared plan.');
			},
		});
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
	 * The "move" to the viewer's own plans: copies the whole share (fresh
	 * ids), drops the visited-list entry, and opens the copy of whichever
	 * shared plan is on screen. Works for anonymous users too - their plans
	 * live in localStorage.
	 */
	public addToMyPlans(): void
	{
		const payload = this.payloadSignal();
		const hydration = this.hydrationSignal();
		if (payload === null || hydration === null) {
			return;
		}

		// The viewed shared plan's payload id, so the copy of that exact plan can be opened.
		const activeId = this.planManager.activePlanId();
		let activePayloadId: string | null = null;
		hydration.idMap.forEach((ephemeralId, payloadId) => {
			if (ephemeralId === activeId) {
				activePayloadId = payloadId;
			}
		});

		const importMap = this.shareImport.import(payload);
		this.visitedShares.remove(payload.share);
		this.notifications.showSuccess('Added to your plans.');

		const version = this.versionManager.versions().find(v => v.id === payload.version.id);
		if (!version) {
			return;
		}
		const slug = this.versionManager.urlSlug(version);
		const targetId = activePayloadId !== null ? importMap.get(activePayloadId) ?? null : null;
		void this.router.navigate(targetId !== null ? ['/', slug, 'planner', targetId] : ['/', slug, 'planner']);
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
