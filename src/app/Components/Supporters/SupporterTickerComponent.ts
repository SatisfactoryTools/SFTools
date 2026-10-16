import {Component, ChangeDetectionStrategy, ElementRef, OnDestroy, Signal, ViewChild, computed, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {SupporterListService} from '@src/Model/Supporters/SupporterListService';

/**
 * Hidden below MIN_NAMES: one name on repeat would read as a single sponsor, not as a community.
 * The name comes last in the sentence, so its changing width never shifts other text.
 */
@Component({
	selector: 'supporter-ticker',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [RouterLink],
	template: `
		@if (current(); as name) {
			<span class="ticker">
				<span>Supported by <a routerLink="/about" fragment="supporters">{{ count() }} people</a>, like</span>
				<strong #nameElement class="ticker-name" [title]="name">{{ name }}</strong>
			</span>
		}
	`,
	styles: [`
		:host {
			display: block;
			min-width: 0;
		}
		.ticker {
			display: inline-flex;
			align-items: center;
			gap: 0.35rem;
			max-width: 100%;
			min-width: 0;
		}
		.ticker span {
			white-space: nowrap;
		}
		.ticker a {
			color: #c5d0db;
			text-decoration: none;
		}
		.ticker a:hover {
			color: #fff;
			text-decoration: underline;
		}
		.ticker-name {
			display: inline-block;
			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			color: #f7d08a;
			font-weight: 600;
			animation: ticker-in 0.6s ease-out;
		}
		@keyframes ticker-in {
			from { opacity: 0; transform: translateY(0.35em); }
			to { opacity: 1; transform: none; }
		}
		@media (prefers-reduced-motion: reduce) {
			.ticker-name { animation: none; }
		}
	`],
})
export class SupporterTickerComponent implements OnDestroy
{

	private static readonly MIN_NAMES = 3;
	private static readonly INTERVAL_MS = 4000;

	private static readonly OUT: Keyframe[] = [
		{opacity: 1, transform: 'none'},
		{opacity: 0, transform: 'translateY(-0.35em)'},
	];
	private static readonly IN: Keyframe[] = [
		{opacity: 0, transform: 'translateY(0.35em)'},
		{opacity: 1, transform: 'none'},
	];

	@ViewChild('nameElement') private nameElement: ElementRef<HTMLElement> | undefined;

	private readonly tickSignal = signal(0);

	/** Shuffled once per list, so every visit starts somewhere else but each name still gets its turn. */
	private readonly order: Signal<string[]> = computed(() => {
		const names = [...new Set(this.supporterList.names())];
		for (let i = names.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[names[i], names[j]] = [names[j], names[i]];
		}
		return names;
	});

	public readonly current: Signal<string | null> = computed(() => {
		const order = this.order();
		return order.length >= SupporterTickerComponent.MIN_NAMES ? order[this.tickSignal() % order.length] : null;
	});

	public readonly count: Signal<number> = computed(() => this.order().length);

	private readonly timer: ReturnType<typeof setInterval>;

	private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

	public constructor(private readonly supporterList: SupporterListService)
	{
		supporterList.ensureLoaded();
		this.timer = setInterval(() => this.advance(), SupporterTickerComponent.INTERVAL_MS);
	}

	public ngOnDestroy(): void
	{
		clearInterval(this.timer);
	}

	/** The same element stays and only its text changes, so the CSS entry animation would not replay - the swap is animated by hand. */
	private advance(): void
	{
		if (document.hidden) {
			return;
		}
		const element = this.nameElement?.nativeElement;
		if (element === undefined || this.reducedMotion.matches || typeof element.animate !== 'function') {
			this.tickSignal.update(tick => tick + 1);
			return;
		}
		element.animate(SupporterTickerComponent.OUT, {duration: 250, easing: 'ease-in', fill: 'forwards'}).finished.then(() => {
			this.tickSignal.update(tick => tick + 1);
			// One frame for the new text to render before it fades in.
			requestAnimationFrame(() => {
				element.getAnimations().forEach(animation => animation.cancel());
				element.animate(SupporterTickerComponent.IN, {duration: 450, easing: 'ease-out'});
			});
		}).catch(() => undefined);
	}

}
