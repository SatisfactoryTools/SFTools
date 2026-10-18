import {Component, ChangeDetectionStrategy, ElementRef, HostListener, Input, OnDestroy, Optional, Renderer2, ViewContainerRef, computed, effect, signal} from '@angular/core';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {Router} from '@angular/router';
import {ComponentLoader, ComponentLoaderFactory} from 'ngx-bootstrap/component-loader';
import {PositioningService} from 'ngx-bootstrap/positioning';
import {TooltipConfig, TooltipContainerComponent} from 'ngx-bootstrap/tooltip';
import {HelpNavigation} from '@src/Components/Help/HelpNavigation';
import {PanelLayoutService} from '@src/Components/Planner/Panel/PanelLayoutService';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {HelpLinkResolver} from '@src/Model/Help/HelpLinkResolver';
import {BackToPlannerResolver} from '@src/Model/Planner/BackToPlannerResolver';
import {HelpImageViewerService} from '@src/Model/Help/HelpImageViewerService';
import {HelpMarkdownRenderer} from '@src/Model/Help/HelpMarkdownRenderer';

const FILE_NAME = /\.(png|jpe?g|gif|webp|avif|svg)$/i;

let tooltipCounter = 0;

/** HelpMarkdownRenderer drops raw HTML and emits only known markup - hence the sanitizer bypass, without which Angular would strip the data attributes the click handler needs. */
@Component({
	selector: 'help-content',
	templateUrl: './HelpContentComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	providers: [ComponentLoaderFactory, PositioningService],
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
		:host ::ng-deep .help-content h2 {
			font-size: 1.3rem;
			margin: 2rem 0 0.6rem;
			padding-bottom: 0.3rem;
			border-bottom: 1px solid #3a4d60;
		}
		:host ::ng-deep .help-content h3 {
			font-size: 1.08rem;
			margin: 1.5rem 0 0.4rem;
			color: #dfe7ef;
		}
		/* Deep links land under the fixed navbar otherwise; the host page says how much of the top is covered. */
		:host ::ng-deep .help-content h2,
		:host ::ng-deep .help-content h3 {
			scroll-margin-top: calc(var(--help-sticky-top, 0.75rem) + 0.5rem);
		}
		:host ::ng-deep .help-content .help-anchor {
			margin-right: 0.35rem;
			color: #4a5b6b;
			text-decoration: none;
			font-weight: 400;
		}
		:host ::ng-deep .help-content .help-anchor:hover {
			color: var(--bs-primary);
		}
		:host ::ng-deep .help-content .help-current-section {
			padding: 0.3rem 0 0.3rem 0.55rem;
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
		/* Bootstrap's own kbd is inverted (dark on light), which disappears in this theme. */
		:host ::ng-deep .help-content kbd {
			color: #e9eef5;
			background: #3a4d60;
			border: 1px solid #4a5b6b;
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
			padding: 0.05em 0.3em;
		}
		:host ::ng-deep .help-content pre {
			background: rgba(0, 0, 0, 0.25);
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
			border-left: 3px solid #3d4a57;
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
		:host ::ng-deep .help-link-icon {
			width: 0.8em;
			height: 0.8em;
			margin: 0 0.3em 0 0.2em;
			vertical-align: -0.05em;
			fill: currentColor;
			opacity: 0.75;
		}
		:host ::ng-deep .help-link-icon-external {
			width: 0.7em;
			height: 0.7em;
			margin: 0 0 0 0.25em;
		}
		:host ::ng-deep .help-callout-body > *:last-child {
			margin-bottom: 0;
		}
		:host ::ng-deep .help-figure {
			margin: 1.25rem 0;
		}
		:host ::ng-deep .help-figure img {
			max-width: 100%;
			border: 1px solid #3a4d60;
			box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
			cursor: zoom-in;
		}
		:host ::ng-deep .help-figure img:focus-visible {
			outline: 2px solid var(--bs-primary);
			outline-offset: 2px;
		}
		:host ::ng-deep .help-figure figcaption {
			margin-top: 0.25rem;
			font-size: 0.85rem;
			color: #9fb0c0;
		}
	`,
})
export class HelpContentComponent implements HelpLinkResolver, OnDestroy
{

	private tooltip: {anchor: HTMLElement, loader: ComponentLoader<TooltipContainerComponent>} | null = null;

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
		private readonly imageViewer: HelpImageViewerService,
		private readonly loaders: ComponentLoaderFactory,
		private readonly positioning: PositioningService,
		private readonly tooltipConfig: TooltipConfig,
		private readonly viewContainer: ViewContainerRef,
		private readonly domRenderer: Renderer2,
		@Optional() private readonly panelLayout: PanelLayoutService | null,
	)
	{
		effect(() => {
			// Re-rendering replaces the link a tooltip is attached to.
			this.html();
			this.hideTooltip();
		});
		effect(() => {
			const anchor = this.navigation.anchor();
			this.html();
			// The headings only exist once the rendered Markdown has been written through innerHTML.
			requestAnimationFrame(() => this.markCurrentSection(anchor));
		});
	}

	public ngOnDestroy(): void
	{
		this.hideTooltip();
	}

	/** The links live in rendered HTML, where the tooltip directive cannot go, so the same tooltip is driven by hand. */
	@HostListener('mouseover', ['$event'])
	@HostListener('focusin', ['$event'])
	protected onTooltipEnter(event: Event): void
	{
		const anchor = (event.target as HTMLElement | null)?.closest<HTMLElement>('a[data-help-tooltip]') ?? null;
		if (anchor === null || anchor === this.tooltip?.anchor) {
			return;
		}
		this.hideTooltip();

		const id = `help-tooltip-${++tooltipCounter}`;
		const loader = this.loaders
			.createLoader<TooltipContainerComponent>(new ElementRef(anchor), this.viewContainer, this.domRenderer)
			.provide({provide: TooltipConfig, useValue: this.tooltipConfig});
		// Same boundary as AppTooltipDirective.
		this.positioning.setOptions({modifiers: {flip: {enabled: true}, preventOverflow: {enabled: true, boundariesElement: 'viewport'}}});
		loader
			.attach(TooltipContainerComponent)
			.to(this.tooltipConfig.container ?? 'body')
			.position({attachment: 'top'})
			.show({content: anchor.getAttribute('data-help-tooltip') ?? '', placement: 'top', id});
		anchor.setAttribute('aria-describedby', id);
		this.tooltip = {anchor, loader};
	}

	@HostListener('mouseout', ['$event'])
	@HostListener('focusout', ['$event'])
	protected onTooltipLeave(event: MouseEvent | FocusEvent): void
	{
		const anchor = this.tooltip?.anchor;
		if (anchor === undefined || !anchor.contains(event.target as Node | null)) {
			return;
		}
		// Moving between the text and the icon inside the same link is not leaving it.
		if (event.relatedTarget instanceof Node && anchor.contains(event.relatedTarget)) {
			return;
		}
		this.hideTooltip();
	}

	private hideTooltip(): void
	{
		if (this.tooltip === null) {
			return;
		}
		this.tooltip.anchor.removeAttribute('aria-describedby');
		this.tooltip.loader.dispose();
		this.tooltip = null;
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

	public sectionHref(anchor: string): string
	{
		return this.articleHref(this.navigation.slug(), anchor);
	}

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

	public panelLabel(panelId: string): string | null
	{
		return this.panelLayout?.registered().find(panel => panel.id === panelId)?.label ?? null;
	}

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
		this.hideTooltip();

		if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
			return true;
		}

		const target = event.target as HTMLElement | null;
		if (target instanceof HTMLImageElement && target.closest('a') === null) {
			event.preventDefault();
			this.openImage(target);
			return false;
		}

		const anchor = target?.closest('a');
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

	@HostListener('keydown', ['$event'])
	protected onKeyDown(event: KeyboardEvent): void
	{
		const target = event.target as HTMLElement | null;
		if ((event.key !== 'Enter' && event.key !== ' ') || !(target instanceof HTMLImageElement)) {
			return;
		}
		event.preventDefault();
		this.openImage(target);
	}

	private openImage(image: HTMLImageElement): void
	{
		const alt = image.alt.trim();
		const caption = image.closest('figure')?.querySelector('figcaption')?.textContent?.trim() ?? '';
		this.imageViewer.open({
			src: image.currentSrc === '' ? image.src : image.currentSrc,
			alt,
			caption: caption !== '' ? caption : (FILE_NAME.test(alt) ? '' : alt),
		});
	}

}
