import {Injectable, Signal, signal} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {skip} from 'rxjs/operators';
import {AuthService} from '@src/Model/Auth/AuthService';
import {PlannerLocation} from '@src/Model/Planner/PlannerLocation';

const STORAGE_KEY = 'sftools.lastPlanner';

/**
 * Remembers the last planner the user had open (per browser, survives
 * reloads) so non-versioned pages like account or settings can offer a way
 * back into the version context.
 */
@Injectable({providedIn: 'root'})
export class PlannerLocationService
{

	private readonly locationSignal = signal<PlannerLocation | null>(null);
	public readonly location: Signal<PlannerLocation | null> = this.locationSignal.asReadonly();

	public constructor(authService: AuthService)
	{
		this.locationSignal.set(this.load());

		// The plan is the account's, and "Back to planner" would open it again
		// (by link, read-only) in the signed-out session. The version stays -
		// it is public, and it is what the way back needs. (Root singleton -
		// no teardown needed.)
		toObservable(authService.isAuthenticated).pipe(skip(1)).subscribe(isAuthenticated => {
			if (!isAuthenticated) {
				this.forgetPlan();
			}
		});
	}

	/** Keeps the remembered version, drops the plan that was open in it. */
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
		localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
	}

	private load(): PlannerLocation | null
	{
		const raw = localStorage.getItem(STORAGE_KEY);
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
