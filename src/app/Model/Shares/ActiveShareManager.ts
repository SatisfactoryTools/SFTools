import {Injectable, Signal, computed, signal} from '@angular/core';
import {Router} from '@angular/router';
import {Observable, of} from 'rxjs';
import {filter, map, switchMap, take, tap, timeout} from 'rxjs/operators';
import {SharesApiService} from '@src/Model/API/SharesApiService';
import {SharedFolderNode} from '@src/Model/API/Schema/Shares/SharedFolderNode';
import {SharedPlanNode} from '@src/Model/API/Schema/Shares/SharedPlanNode';
import {SharePayload} from '@src/Model/API/Schema/Shares/SharePayload';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {NotificationService} from '@src/Model/NotificationService';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanTreeFolder} from '@src/Model/Planner/PlanTreeFolder';
import {PlanTreePlan} from '@src/Model/Planner/PlanTreePlan';
import {ShareHydration} from '@src/Model/Shares/ShareHydration';
import {ShareImportService} from '@src/Model/Shares/ShareImportService';
import {ShareTreeCache} from '@src/Model/Shares/ShareTreeCache';
import {ShareVersionLinker} from '@src/Model/Shares/ShareVersionLinker';
import {SharePayloadHydrator} from '@src/Model/Shares/SharePayloadHydrator';
import {VisitedSharesManager} from '@src/Model/Shares/VisitedSharesManager';

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

	public readonly active: Signal<boolean> = computed(() => this.payloadSignal() !== null);

	/** Cached so the redirect → planner hop does not fetch the share twice. */
	private cachedPayload: {shareId: string; payload: SharePayload} | null = null;

	private pendingPlan: {shareId: string; payloadPlanId: string} | null = null;

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
		private readonly versionLinker: ShareVersionLinker,
		private readonly versionManager: VersionManager,
		private readonly visitedShares: VisitedSharesManager,
		private readonly hydrator: SharePayloadHydrator,
		private readonly shareImport: ShareImportService,
		private readonly shareTrees: ShareTreeCache,
		private readonly planManager: PlanManager,
		private readonly notifications: NotificationService,
		private readonly router: Router,
	)
	{
	}

	public prepare(shareId: string): Observable<SharePayload>
	{
		if (this.cachedPayload?.shareId === shareId) {
			return of(this.cachedPayload.payload);
		}
		return this.sharesApi.getShare(shareId).pipe(
			switchMap(payload => this.versionLinker.ensure(payload.version.id).pipe(map(() => payload))),
			tap(payload => {
				this.cachedPayload = {shareId, payload};
				this.shareTrees.record(payload);
				this.visitedShares.recordVisit(payload);
			}),
		);
	}

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
				this.loadErrorSignal.set('This shared plan does not exist, or the link is broken.');
				this.notifications.show('Could not load the shared plan.');
			},
		});
	}

	public hydratedPlanId(payloadPlanId: string): string | null
	{
		return this.hydrationSignal()?.idMap.get(payloadPlanId) ?? null;
	}

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

	public selectPlan(shareId: string, payloadPlanId: string): void
	{
		const hydrated = this.shareIdSignal() === shareId ? this.hydratedPlanId(payloadPlanId) : null;
		if (hydrated !== null) {
			this.planManager.setActivePlan(hydrated);
			return;
		}
		this.pendingPlan = {shareId, payloadPlanId};
	}

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

	public isShareVersionActive(shareVersionId: string): boolean
	{
		return this.versionManager.activeVersion()?.id === shareVersionId;
	}

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

	/** Waits for the plan store to reload for the switched version: importing before that would be overwritten by the reload. */
	private addAfterVersionSwitch(payload: SharePayload): void
	{
		const version = this.versionManager.versions().find(v => v.id === payload.version.id);
		if (!version) {
			this.notifications.show('The game version of this shared plan is no longer available.');
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
			error: () => this.notifications.show(`Could not switch to ${version.name}. The shared plan was not added.`),
		});
		void this.router.navigate(['/', slug, 'planner']);
	}

}
