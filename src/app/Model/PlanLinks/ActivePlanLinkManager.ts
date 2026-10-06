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

@Injectable({providedIn: 'root'})
export class ActivePlanLinkManager
{

	private readonly payloadSignal = signal<PlanLinkPayload | null>(null);
	public readonly payload: Signal<PlanLinkPayload | null> = this.payloadSignal.asReadonly();

	private readonly unavailableSignal = signal<boolean>(false);
	public readonly unavailable: Signal<boolean> = this.unavailableSignal.asReadonly();

	public readonly active: Signal<boolean> = computed(() => this.payloadSignal() !== null);

	private planId: string | null = null;

	/** Repeating store emissions must not re-fetch ids that already failed. */
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

	public dismissUnavailable(): void
	{
		this.unavailableSignal.set(false);
	}

	public plan(): Plan | null
	{
		return this.planId === null ? null : this.planManager.findPlan(this.planId);
	}

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

	/** A link pasted under the wrong version slug still opens; the address bar is corrected so reloading and copying it keep working. */
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
