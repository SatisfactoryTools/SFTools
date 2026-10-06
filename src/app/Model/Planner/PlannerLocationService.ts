import {Injectable, Signal, signal} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {skip} from 'rxjs/operators';
import {AuthService} from '@src/Model/Auth/AuthService';
import {PlannerLocation} from '@src/Model/Planner/PlannerLocation';
import {AppStorage} from '@src/Model/Storage/AppStorage';

const STORAGE_KEY = 'sftools.lastPlanner';

@Injectable({providedIn: 'root'})
export class PlannerLocationService
{

	private readonly locationSignal = signal<PlannerLocation | null>(null);
	public readonly location: Signal<PlannerLocation | null> = this.locationSignal.asReadonly();

	public constructor(
		authService: AuthService,
		private readonly storage: AppStorage,
	)
	{
		this.locationSignal.set(this.load());

		// On sign-out the plan is the account's (the link would reopen it read-only); the version is public and stays.
		toObservable(authService.isAuthenticated).pipe(skip(1)).subscribe(isAuthenticated => {
			if (!isAuthenticated) {
				this.forgetPlan();
			}
		});
	}

	public forgetPlan(): void
	{
		const location = this.locationSignal();
		if (location === null || location.planId === null) {
			return;
		}
		this.remember(location.versionSlug, null);
	}

	public remember(versionSlug: string, planId: string | null): void
	{
		const location: PlannerLocation = {versionSlug, planId};
		this.locationSignal.set(location);
		this.storage.setItem(STORAGE_KEY, JSON.stringify(location));
	}

	private load(): PlannerLocation | null
	{
		const raw = this.storage.getItem(STORAGE_KEY);
		if (raw === null) {
			return null;
		}
		try {
			const parsed = JSON.parse(raw) as PlannerLocation;
			if (typeof parsed?.versionSlug !== 'string') {
				return null;
			}
			return {versionSlug: parsed.versionSlug, planId: typeof parsed.planId === 'string' ? parsed.planId : null};
		} catch {
			return null;
		}
	}

}
