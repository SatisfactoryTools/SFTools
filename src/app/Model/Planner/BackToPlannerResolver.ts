import {Injectable, Signal, computed} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {NavigationEnd, Router} from '@angular/router';
import {filter, map} from 'rxjs/operators';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {PlannerLocationService} from '@src/Model/Planner/PlannerLocationService';

@Injectable({providedIn: 'root'})
export class BackToPlannerResolver
{

	/** Version pages that stand in for a planner panel. */
	private static readonly PAGES: ReadonlyArray<string> = ['codex', 'map'];

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

	private isOn(path: string): boolean
	{
		const url = this.currentUrl();
		return url === path || ['/', '?', '#'].some(separator => url.startsWith(path + separator));
	}

	private resolve(): string[] | null
	{
		const version = this.versionManager.activeVersion();
		const location = this.plannerLocation.location();

		if (version !== null) {
			const slug = this.versionManager.urlSlug(version);
			if (!BackToPlannerResolver.PAGES.some(page => this.isOn(`/${slug}/${page}`))) {
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
