import {Component, ChangeDetectionStrategy, ElementRef, HostListener, Input, Optional, computed, effect, signal} from '@angular/core';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {Router} from '@angular/router';
import {HelpNavigation} from '@src/Components/Help/HelpNavigation';
import {PanelLayoutService} from '@src/Components/Planner/Panel/PanelLayoutService';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {HelpLinkResolver} from '@src/Model/Help/HelpLinkResolver';
import {BackToPlannerResolver} from '@src/Model/Planner/BackToPlannerResolver';
import {HelpMarkdownRenderer} from '@src/Model/Help/HelpMarkdownRenderer';

/**
 * Renders an article's Markdown and keeps its links inside the app: article
 * and route links go through the router, `panel:` links bring up the planner
 * panel they name, and everything external opens in a new tab.
 *
 * The rendered HTML is built by HelpMarkdownRenderer, which drops raw HTML and
 * only ever emits the markup and attributes below - hence the bypass, without
 * which Angular would strip the data attributes the click handler needs.
 */
@Component({
	selector: 'help-content',
	templateUrl: './HelpContentComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	styles: `
		:host {
			display: block;
		}
		/* The content is inserted as HTML, so component styles have to reach into it. */
		:host ::ng-deep .help-content {
			line-height: 1.7;
			max-width: 74ch;
		}
		:host ::ng-deep .help-content > *:first-child {
			margin-top: 0;
		}
		/* Sections are the landmarks of a long article: a rule above each one
		   breaks the page into blocks the eye can find its way back to. */
		:host ::ng-deep .help-content h2 {
			font-size: 1.3rem;
			margin: 2rem 0 0.6rem;
			padding-bottom: 0.3rem;
			border-bottom: 1px solid #2b3444;
		}
		:host ::ng-deep .help-content h3 {
			font-size: 1.08rem;
			margin: 1.5rem 0 0.4rem;
			color: #dfe7ef;
		}
		/* Deep links land under the fixed navbar otherwise; the host page says
		   how much of the top is covered. */
		:host ::ng-deep .help-content h2,
		:host ::ng-deep .help-content h3 {
			scroll-margin-top: calc(var(--help-sticky-top, 0.75rem) + 0.5rem);
		}
		/* The '#' in front of a heading: quiet until pointed at, and the way to
		   copy the address of one section. */
		:host ::ng-deep .help-content .help-anchor {
			margin-right: 0.35rem;
			color: #4a566b;
			text-decoration: none;
			font-weight: 400;
		}
		:host ::ng-deep .help-content .help-anchor:hover {
			color: var(--bs-primary);
		}
		/* The section the current address names, for a reader who followed a
		   link to one part of a long article. */
		:host ::ng-deep .help-content .help-current-section {
			padding-left: 0.55rem;
			border-left: 3px solid var(--bs-primary);
			background: linear-gradient(90deg, color-mix(in srgb, var(--bs-primary) 16%, transparent), transparent 70%);
		}
		:host ::ng-deep .help-content .help-current-section .help-anchor {
			color: var(--bs-primary);
		}
		:host ::ng-deep .help-content p,
		:host ::ng-deep .help-content ul,
		:host ::ng-deep .help-content ol {
			margin-bottom: 0.9rem;
		}
		:host ::ng-deep .help-content ul,
		:host ::ng-deep .help-content ol {
			padding-left: 1.3rem;
		}
		:host ::ng-deep .help-content li + li {
			margin-top: 0.3rem;
		}
		/* Bootstrap's own kbd is inverted (dark text on light), which disappears
		   in this theme, so the colour is set here as well. */
		:host ::ng-deep .help-content kbd {
			color: #e9eef5;
			background: #2b3444;
			border: 1px solid #4a566b;
			border-radius: 3px;
			padding: 0.1em 0.4em;
			font-size: 0.85em;
			font-family: var(--bs-font-monospace);
		}
		:host ::ng-deep .help-content .help-hotkey-unset {
			color: #9fb0c0;
			font-style: italic;
		}
		:host ::ng-deep .help-content code {
			background: rgba(255, 255, 255, 0.07);
			border-radius: 3px;
			padding: 0.05em 0.3em;
		}
		:host ::ng-deep .help-content pre {
			background: rgba(0, 0, 0, 0.25);
			border-radius: 4px;
			padding: 0.6rem 0.8rem;
			overflow-x: auto;
		}
		:host ::ng-deep .help-content pre code {
			background: none;
			padding: 0;
		}
		:host ::ng-deep .help-content strong {
			color: #e9eef5;
		}
		:host ::ng-deep .help-content blockquote {
			border-left: 3px solid #3d4757;
			padding-left: 0.75rem;
			color: #c5d0db;
		}
		/* Same tinted box as <info-note>, which cannot be used inside rendered HTML. */
		:host ::ng-deep .help-callout {
			display: flex;
			align-items: flex-start;
			gap: 0.5rem;
			padding: 0.55rem 0.75rem;
			margin: 1.1rem 0;
			border-radius: 0 4px 4px 0;
			font-size: 0.875rem;
			line-height: 1.4;
			color: #c5d0db;
			background: rgba(91, 192, 222, 0.1);
			border-left: 3px solid #5bc0de;
		}
		:host ::ng-deep .help-callout-warning {
			color: #e9dcb8;
			background: rgba(240, 173, 78, 0.12);
			border-left-color: #f0ad4e;
		}
		:host ::ng-deep .help-callout-tip {
			color: #cfe6cf;
			background: rgba(92, 184, 92, 0.12);
			border-left-color: #5cb85c;
		}
		:host ::ng-deep .help-callout-icon {
			flex-shrink: 0;
			width: 1em;
			height: 1em;
			margin-top: 0.25em;
			fill: #5bc0de;
		}
		:host ::ng-deep .help-callout-warning .help-callout-icon {
			fill: #f0ad4e;
		}
		:host ::ng-deep .help-callout-tip .help-callout-icon {
			fill: #5cb85c;
		}
		:host ::ng-deep .help-callout-body > *:last-child {
			margin-bottom: 0;
		}
		:host ::ng-deep .help-figure {
			margin: 1.25rem 0;
		}
		:host ::ng-deep .help-figure img {
			max-width: 100%;
			border: 1px solid #2b3444;
			border-radius: 4px;
			box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
		}
		:host ::ng-deep .help-figure figcaption {
			margin-top: 0.25rem;
			font-size: 0.85rem;
			color: #9fb0c0;
		}
	`,
})
export class HelpContentComponent implements HelpLinkResolver
{

	private readonly markdownSignal = signal('');

	@Input({required: true})
	public set markdown(value: string)
	{
		this.markdownSignal.set(value);
	}

	protected readonly html = computed<SafeHtml>(() => this.sanitizer.bypassSecurityTrustHtml(
		this.renderer.render(this.markdownSignal(), this),
	));

	public constructor(
		private readonly renderer: HelpMarkdownRenderer,
		private readonly sanitizer: DomSanitizer,
		private readonly host: ElementRef<HTMLElement>,
		private readonly navigation: HelpNavigation,
		private readonly router: Router,
		private readonly versionManager: VersionManager,
		private readonly backToPlanner: BackToPlannerResolver,
		@Optional() private readonly panelLayout: PanelLayoutService | null,
	)
	{
		// Mark the section the address points at, so a reader arriving through
		// someone's link sees where they were meant to start.
		effect(() => {
			const anchor = this.navigation.anchor();
			this.html();
			// One frame later: the headings only exist once the rendered
			// Markdown has been written through innerHTML.
			requestAnimationFrame(() => this.markCurrentSection(anchor));
		});
	}

	private markCurrentSection(anchor: string): void
	{
		const headings = this.host.nativeElement.querySelectorAll('.help-content :is(h1, h2, h3)');
		headings.forEach(heading => heading.classList.toggle('help-current-section', heading.id === anchor && anchor !== ''));
	}

	public articleHref(slug: string, anchor: string): string
	{
		return this.router.serializeUrl(this.navigation.urlTree(HelpNavigation.pathFor(slug, anchor)));
	}

	/** The '#' of a heading points at the section within the article being read. */
	public sectionHref(anchor: string): string
	{
		return this.articleHref(this.navigation.slug(), anchor);
	}

	/**
	 * Inside the planner the link opens the panel where the reader already is,
	 * so it points at the current URL; on the fullscreen page it leads back
	 * into the planner with the wanted panel in `?panel=`, which the planner
	 * brings up on arrival. Empty when there is no planner to go back to - a
	 * reader who has not opened one yet - and the name is then left as plain
	 * text rather than a link that goes nowhere useful.
	 */
	public panelHref(panelId: string): string
	{
		if (this.panelLayout !== null) {
			return this.router.url;
		}
		const planner = this.plannerLink();
		return planner === null
			? ''
			: this.router.serializeUrl(this.router.createUrlTree(planner, {queryParams: {panel: panelId}}));
	}

	/** Where "back to the planner" goes: the last one visited, or the active version's. */
	private plannerLink(): string[] | null
	{
		const remembered = this.backToPlanner.link();
		if (remembered !== null) {
			return remembered;
		}
		const version = this.versionManager.activeVersion();
		return version === null ? null : ['/', this.versionManager.urlSlug(version), 'planner'];
	}

	@HostListener('click', ['$event'])
	protected onClick(event: MouseEvent): boolean
	{
		// Modified or non-primary clicks fall through to the browser (new tab etc.).
		if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
			return true;
		}

		const anchor = (event.target as HTMLElement | null)?.closest('a');
		if (anchor === null || anchor === undefined) {
			return true;
		}

		const article = anchor.getAttribute('data-help-article');
		if (article !== null) {
			event.preventDefault();
			void this.navigation.navigate(HelpNavigation.pathFor(article, anchor.getAttribute('data-help-anchor') ?? ''));
			return false;
		}

		const section = anchor.getAttribute('data-help-section');
		if (section !== null) {
			event.preventDefault();
			void this.navigation.navigate(HelpNavigation.pathFor(this.navigation.slug(), section));
			return false;
		}

		const panel = anchor.getAttribute('data-help-panel');
		if (panel !== null) {
			if (this.panelLayout !== null) {
				event.preventDefault();
				this.panelLayout.focusPanel(panel);
				return false;
			}
			// The fullscreen page: back into the planner, which opens the panel
			// named in the link's own `?panel=`.
			const target = anchor.getAttribute('href') ?? '';
			if (target !== '') {
				event.preventDefault();
				void this.router.navigateByUrl(target);
				return false;
			}
		}

		const route = anchor.getAttribute('data-help-route');
		if (route !== null) {
			event.preventDefault();
			void this.router.navigateByUrl(route);
			return false;
		}

		return true;
	}

}
