import {Component, ChangeDetectionStrategy, OnDestroy, ViewChild, computed} from '@angular/core';
import {NavigationEnd, Router, RouterLink, RouterLinkActive} from '@angular/router';
import {Subscription} from 'rxjs';
import {filter} from 'rxjs/operators';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faDiagramProject, faGear, faMagnifyingGlass} from '@fortawesome/free-solid-svg-icons';
import {CollapseModule} from 'ngx-bootstrap/collapse';
import {NavbarVersionSwitcherComponent} from '@src/Components/Root/NavbarVersionSwitcherComponent';
import {NavbarSearchComponent} from '@src/Components/Root/NavbarSearchComponent';
import {MobileSearchComponent} from '@src/Components/Root/MobileSearchComponent';
import {NavbarCommunityLinksComponent} from '@src/Components/Root/NavbarCommunityLinksComponent';
import {NavbarUserDropdownComponent} from '@src/Components/Root/NavbarUserDropdownComponent';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {HelpManager} from '@src/Model/Help/HelpManager';
import {HotkeyRegistration} from '@src/Model/Hotkeys/HotkeyRegistration';
import {HotkeyService} from '@src/Model/Hotkeys/HotkeyService';
import {BackToPlannerResolver} from '@src/Model/Planner/BackToPlannerResolver';

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
		MobileSearchComponent,
		NavbarUserDropdownComponent,
		NavbarCommunityLinksComponent,
	],
	// On desktop the search sits between the side groups and shrinks when they
	// leave too little room; on a phone it is the fullscreen mobile-search
	// instead, so the box itself is hidden there.
	styles: `
		/* Phone shortcuts and the menu button compete with the brand for one
		   row: the shortcut label goes first (below 420px), then the wordmark
		   shrinks to the S mark (below 360px). */
		/* Phone shortcuts and the menu toggler share one look: white glyph, soft white frame. */
		.navbar-shortcut,
		.navbar-toggler {
			--bs-btn-color: #fff;
			--bs-btn-border-color: rgba(255, 255, 255, 0.45);
			--bs-btn-hover-color: #fff;
			--bs-btn-hover-bg: rgba(255, 255, 255, 0.15);
			--bs-btn-hover-border-color: rgba(255, 255, 255, 0.7);
			--bs-btn-active-color: #fff;
			--bs-btn-active-bg: rgba(255, 255, 255, 0.25);
			--bs-btn-active-border-color: rgba(255, 255, 255, 0.7);
			border-color: rgba(255, 255, 255, 0.45);
		}
		.navbar-shortcut {
			padding: 0.3rem 0.6rem;
		}
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

			/* Wider than a plain nav item - it searches everything - but it
			   gives the room back to the two side groups when they need it. */
			navbar-search {
				flex: 0 1 420px;
				min-width: 0;
				margin-left: auto;
				margin-right: 1.25rem;
			}
		}
		@media (min-width: 1200px) {
			navbar-search {
				flex-basis: 500px;
			}
		}
	`,
})
export class NavbarComponent implements OnDestroy
{

	public readonly faGear = faGear;
	public readonly faDiagramProject = faDiagramProject;
	public readonly faMagnifyingGlass = faMagnifyingGlass;

	/** Bootstrap's lg breakpoint: below it the navbar is folded into the menu. */
	private static readonly WIDE_SCREEN = 992;

	@ViewChild('search') private search: NavbarSearchComponent | undefined;

	@ViewChild('mobileSearch') private mobileSearch: MobileSearchComponent | undefined;

	public collapsed = true;

	/** The navbar sits on every page, so it is where the app-wide hotkeys live. */
	private readonly hotkeyRegistrations: HotkeyRegistration[];

	private readonly subscription: Subscription;

	/** Where the "Back to planner" link goes; null when it does not apply here. */
	public readonly backToPlannerLink = computed(() => this.backToPlanner.link());

	public ngOnDestroy(): void
	{
		this.hotkeyRegistrations.forEach(registration => registration.unregister());
		this.subscription.unsubscribe();
	}

	/** Already on a settings page? Leave it alone - re-entering would throw the open section away. */
	private openSettings(): void
	{
		if (!this.router.url.startsWith('/settings')) {
			void this.router.navigate(['/settings']);
		}
	}

	private goBackToPlanner(): void
	{
		const link = this.backToPlannerLink();
		if (link) {
			void this.router.navigate(link);
		}
	}

	/**
	 * Search, from the shortcut or the phone's magnifier: the navbar's own box
	 * where there is room for it, the fullscreen search where there is not.
	 * The menu is left alone either way - unfolding it on a wide screen made
	 * the whole navbar grow and snap back.
	 */
	public openSearch(): void
	{
		if (window.innerWidth < NavbarComponent.WIDE_SCREEN) {
			this.mobileSearch?.show();
			return;
		}
		this.search?.focus();
	}

	/**
	 * The search covers the codex and the user's plans, which need a version -
	 * but also the help articles, which do not, so it stays available on the
	 * version-less pages as long as there is help to find.
	 */
	protected readonly searchAvailable = computed(
		() => this.versionManager.activeVersion() !== null || this.help.hasArticles(),
	);

	public constructor(
		protected readonly versionManager: VersionManager,
		private readonly help: HelpManager,
		private readonly backToPlanner: BackToPlannerResolver,
		hotkeys: HotkeyService,
		private readonly router: Router,
	)
	{
		this.hotkeyRegistrations = [
			hotkeys.register('app.search', () => this.openSearch()),
			// The page's own back link takes this over where there is one
			// (see BackLinkComponent); this covers the pages without one.
			hotkeys.register('app.back', () => this.goBackToPlanner()),
			hotkeys.register('app.settings', () => this.openSettings()),
			hotkeys.register('app.home', () => void this.router.navigate(['/'])),
		];
		// Picking a destination from the expanded mobile menu closes it - the
		// menu would otherwise stay open over the new page.
		this.subscription = router.events
			.pipe(filter(event => event instanceof NavigationEnd))
			.subscribe(() => this.collapsed = true);
	}

}
