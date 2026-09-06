import {Injectable, Signal, effect, signal} from '@angular/core';
import {VersionsApiService} from '@src/Model/API/VersionsApiService';
import {VersionPlanCount} from '@src/Model/API/Schema/Plans/VersionPlanCount';
import {AuthService} from '@src/Model/Auth/AuthService';

/**
 * The signed-in user's plan count and last edit per version, for the home
 * page cards. Refreshed on demand (each home page visit); emptied on logout.
 * Local (signed-out) plans are counted client-side by LocalPlanStoreBackend.
 */
@Injectable({providedIn: 'root'})
export class PlanCountsService
{

	private readonly countsSignal = signal<ReadonlyMap<string, VersionPlanCount>>(new Map());
	public readonly counts: Signal<ReadonlyMap<string, VersionPlanCount>> = this.countsSignal.asReadonly();

	public constructor(
		private readonly auth: AuthService,
		private readonly versionsApi: VersionsApiService,
	)
	{
		effect(() => {
			if (!this.auth.isAuthenticated()) {
				this.countsSignal.set(new Map());
			}
		});
	}

	public refresh(): void
	{
		if (!this.auth.isAuthenticated()) {
			return;
		}
		this.versionsApi.planCounts().subscribe({
			next: response => this.countsSignal.set(new Map(Object.entries(response.versions))),
			error: () => undefined,
		});
	}

	/** Null when the user has no plans in the version (or the counts are not loaded). */
	public countFor(versionId: string): VersionPlanCount | null
	{
		return this.counts().get(versionId) ?? null;
	}

}
