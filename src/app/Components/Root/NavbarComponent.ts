import {Component, ChangeDetectionStrategy, Signal, ViewChild, computed} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {NavigationEnd, Router, RouterLink, RouterLinkActive} from '@angular/router';
import {filter, map, tap} from 'rxjs/operators';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faDiagramProject, faGear, faMagnifyingGlass} from '@fortawesome/free-solid-svg-icons';
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
		/* Phone shortcuts and the menu button compete with the brand for one
		   row: the shortcut label goes first (below 420px), then the wordmark
		   shrinks to the S mark (below 360px). */
		@media (max-width: 419.98px) {
			.shortcut-label { display: none; }
		}
		@media (max-width: 359.98px) {
			.brand-full { display: none; }
		}
		@media (min-width: 360px) {
			.brand-mark { display: none; }
		}
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
	public readonly faMagnifyingGlass = faMagnifyingGlass;

	@ViewChild('search') private search: NavbarSearchComponent | undefined;

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

	/** Phone search shortcut: expand the menu and put the caret into the search box once it has unfolded. */
	public openSearch(): void
	{
		this.collapsed = false;
		setTimeout(() => this.search?.focus(), 400);
	}

	public constructor(
		protected readonly versionManager: VersionManager,
		private readonly plannerLocation: PlannerLocationService,
		router: Router,
	)
	{
		this.currentUrl = toSignal(
			router.events.pipe(
				filter(event => event instanceof NavigationEnd),
				// Picking a destination from the expanded mobile menu closes it -
				// the menu would otherwise stay open over the new page.
				tap(() => this.collapsed = true),
				map(() => router.url),
			),
			{initialValue: router.url},
		);
	}

}
