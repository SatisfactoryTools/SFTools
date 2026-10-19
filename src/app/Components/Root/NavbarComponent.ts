import {AfterViewInit, Component, ChangeDetectionStrategy, ElementRef, OnDestroy, ViewChild, computed} from '@angular/core';
import {NavigationEnd, Router, RouterLink, RouterLinkActive} from '@angular/router';
import {Subscription} from 'rxjs';
import {filter} from 'rxjs/operators';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faCircleQuestion, faDiagramProject, faGear, faMagnifyingGlass} from '@fortawesome/free-solid-svg-icons';
import {CollapseModule} from 'ngx-bootstrap/collapse';
import {NavbarVersionSwitcherComponent} from '@src/Components/Root/NavbarVersionSwitcherComponent';
import {NavbarSearchComponent} from '@src/Components/Root/NavbarSearchComponent';
import {MobileSearchComponent} from '@src/Components/Root/MobileSearchComponent';
import {NavbarCommunityLinksComponent} from '@src/Components/Root/NavbarCommunityLinksComponent';
import {NavbarUserDropdownComponent} from '@src/Components/Root/NavbarUserDropdownComponent';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {AccountProfileService} from '@src/Model/Auth/AccountProfileService';
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
		AppTooltipDirective,
	],
	styles: `
		.navbar-supporter {
			background: linear-gradient(100deg, #8a5d0e 0%, #a87a19 45%, #b98a24 70%, #976a12 100%);
		}
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
export class NavbarComponent implements AfterViewInit, OnDestroy
{

	public readonly faGear = faGear;
	public readonly faDiagramProject = faDiagramProject;
	public readonly faMagnifyingGlass = faMagnifyingGlass;
	public readonly faCircleQuestion = faCircleQuestion;

	/** Bootstrap's lg breakpoint: below it the navbar is folded into the menu. */
	private static readonly WIDE_SCREEN = 992;

	@ViewChild('search') private search: NavbarSearchComponent | undefined;

	@ViewChild('mobileSearch') private mobileSearch: MobileSearchComponent | undefined;

	@ViewChild('navbar') private navbar!: ElementRef<HTMLElement>;

	@ViewChild('menu') private menu!: ElementRef<HTMLElement>;

	private resizeObserver: ResizeObserver | null = null;

	public collapsed = true;

	/** The navbar sits on every page, so it is where the app-wide hotkeys live. */
	private readonly hotkeyRegistrations: HotkeyRegistration[];

	private readonly subscription: Subscription;

	public readonly backToPlannerLink = computed(() => this.backToPlanner.link());

	public ngAfterViewInit(): void
	{
		this.resizeObserver = new ResizeObserver(() => this.publishHeight());
		this.resizeObserver.observe(this.navbar.nativeElement);
		this.resizeObserver.observe(this.menu.nativeElement);
		this.publishHeight();
	}

	/**
	 * The page below is offset by this rather than a fixed 56px: OS-level text
	 * scaling (Windows "Text size") grows the navbar and it would cover the top
	 * of the page. The unfolded mobile menu is left out so it overlays the page
	 * instead of pushing it down.
	 */
	private publishHeight(): void
	{
		let height = this.navbar.nativeElement.getBoundingClientRect().height;
		if (window.innerWidth < NavbarComponent.WIDE_SCREEN) {
			height -= this.menu.nativeElement.getBoundingClientRect().height;
		}
		document.documentElement.style.setProperty('--navbar-height', `${Math.round(height)}px`);
	}

	public ngOnDestroy(): void
	{
		this.resizeObserver?.disconnect();
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

	/** The menu is left alone either way - unfolding it on a wide screen made the whole navbar grow and snap back. */
	public openSearch(): void
	{
		if (window.innerWidth < NavbarComponent.WIDE_SCREEN) {
			this.mobileSearch?.show();
			return;
		}
		this.search?.focus();
	}

	/** Help articles need no version, so the search stays available on version-less pages as long as there is help to find. */
	protected readonly searchAvailable = computed(
		() => this.versionManager.activeVersion() !== null || this.help.hasArticles(),
	);

	/** No articles loaded (yet, or the API is down): a link to an empty help page would be a dead end. */
	protected readonly helpAvailable = computed(() => this.help.hasArticles());

	public constructor(
		protected readonly account: AccountProfileService,
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
