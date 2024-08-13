import {Component, ChangeDetectionStrategy, Signal, computed} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {NavigationEnd, Router, RouterLink, RouterLinkActive} from '@angular/router';
import {filter, map} from 'rxjs/operators';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faDiagramProject, faGear} from '@fortawesome/free-solid-svg-icons';
import {CollapseModule} from 'ngx-bootstrap/collapse';
import {NavbarVersionSwitcherComponent} from '@src/Components/Root/NavbarVersionSwitcherComponent';
import {NavbarSearchComponent} from '@src/Components/Root/NavbarSearchComponent';
import {NavbarUserDropdownComponent} from '@src/Components/Root/NavbarUserDropdownComponent';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {PlannerLocationService} from '@src/Model/Planner/PlannerLocationService';

@Component({
	selector: 'navbar',
	templateUrl: './NavbarComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [
		RouterLink,
		RouterLinkActive,
		FaIconComponent,
		CollapseModule,
		NavbarVersionSwitcherComponent,
		NavbarSearchComponent,
		NavbarUserDropdownComponent,
	],
	// On desktop the search is centered between the side groups and shrinks
	// when they leave too little room; on mobile it flows inside the collapse.
	styles: `
		@media (min-width: 992px) {
			.navbar-collapse {
				min-width: 0;
			}

			.navbar-nav {
				flex-shrink: 0;
			}

			navbar-search {
				flex: 0 1 360px;
				min-width: 0;
				margin-left: auto;
			}
		}
	`,
})
export class NavbarComponent
{

	public readonly faGear = faGear;
	public readonly faDiagramProject = faDiagramProject;

	public collapsed = true;

	private readonly currentUrl: Signal<string>;

	/**
	 * Link back to the last visited planner. Offered outside a version context
	 * (while the remembered version still exists), and on the fullscreen codex
	 * - there it targets the current version's planner directly.
	 */
	public readonly backToPlannerLink = computed<string[] | null>(() => {
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
	});

	public constructor(
		protected readonly versionManager: VersionManager,
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
	}

}
