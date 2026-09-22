import {Injectable, Signal, computed} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {NavigationEnd, Router} from '@angular/router';
import {filter, map} from 'rxjs/operators';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {PlannerLocationService} from '@src/Model/Planner/PlannerLocationService';

/**
 * Where "Back to planner" goes: the last visited planner, down to the plan
 * that was open. Offered outside a version context (while the remembered
 * version still exists), and on the fullscreen codex - there it targets the
 * current version's planner directly. Null when the planner is already what
 * is on screen.
 *
 * Shared, because both the navbar link and the Escape hotkey need the same
 * answer.
 */
@Injectable({providedIn: 'root'})
export class BackToPlannerResolver
{

	public readonly link: Signal<string[] | null>;

	private readonly currentUrl: Signal<string>;

	public constructor(
		private readonly versionManager: VersionManager,
		private readonly plannerLocation: PlannerLocationService,
		router: Router,
	)
	{
		this.currentUrl = toSignal(
			router.events.pipe(
				filter(event => event instanceof NavigationEnd),
				map(() => router.url),
			),
			{initialValue: router.url},
		);
		this.link = computed(() => this.resolve());
	}

	private resolve(): string[] | null
	{
		const version = this.versionManager.activeVersion();
		const location = this.plannerLocation.location();

		if (version !== null) {
			const slug = this.versionManager.urlSlug(version);
			if (!this.currentUrl().startsWith(`/${slug}/codex`)) {
				return null;
			}
			const link = ['/', slug, 'planner'];
			if (location !== null && location.versionSlug === slug && location.planId !== null) {
				link.push(location.planId);
			}
			return link;
		}

		if (location === null || this.versionManager.findByUrlSlug(location.versionSlug) === null) {
			return null;
		}
		const link = ['/', location.versionSlug, 'planner'];
		if (location.planId !== null) {
			link.push(location.planId);
		}
		return link;
	}

}
