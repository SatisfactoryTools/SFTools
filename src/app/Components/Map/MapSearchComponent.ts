import {ChangeDetectionStrategy, Component, computed, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, signal, ViewChild} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faMagnifyingGlass, faXmark} from '@fortawesome/free-solid-svg-icons';
import {SearchFragmentsComponent} from '@src/Components/Common/SearchFragmentsComponent';
import {MapCoordinateFormatter} from '@src/Model/Map/MapCoordinateFormatter';
import {MapSearchEntry} from '@src/Model/Map/MapSearchEntry';
import {MapSearchResult} from '@src/Model/Map/MapSearchResult';
import {TextMatcher} from '@src/Model/Search/TextMatcher';

@Component({
	selector: 'map-search',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, SearchFragmentsComponent],
	template: `
		<div class="search-box shadow-sm" [class.open]="open()">
			<fa-icon class="search-icon text-secondary" [icon]="faMagnifyingGlass"></fa-icon>
			<input
				#input
				type="search"
				class="form-control form-control-sm"
				placeholder="Search the map, or X Y"
				aria-label="Search the map"
				autocomplete="off"
				[value]="query()"
				(input)="onInput($any($event.target).value)"
				(focus)="onFocus()"
				(keydown)="onKeyDown($event)"
			/>
			@if (query() !== '') {
				<button type="button" class="btn btn-link btn-sm text-reset clear" aria-label="Clear the search" (click)="clear()">
					<fa-icon [icon]="faXmark"></fa-icon>
				</button>
			}
		</div>
		@if (open()) {
			<div class="results shadow" role="listbox">
				@for (result of results(); track result.entry.id; let index = $index) {
					<button
						type="button"
						class="result d-flex align-items-center gap-2"
						role="option"
						[class.active]="index === selected()"
						[attr.aria-selected]="index === selected()"
						(mousedown)="$event.preventDefault()"
						(click)="choose(result.entry)"
					>
						@if (result.entry.iconUrl) {
							<img class="result-icon" [src]="result.entry.iconUrl" alt="" [style.border-color]="result.entry.color ?? 'transparent'"/>
						} @else {
							<span class="result-dot" [style.background]="result.entry.color ?? '#4e5d6c'"></span>
						}
						<span class="d-flex flex-column flex-grow-1" style="min-width: 0">
							<span class="text-truncate"><search-fragments [fragments]="result.fragments"/></span>
							@if (result.entry.detail) {
								<span class="small text-secondary text-truncate">{{ result.entry.detail }}</span>
							}
						</span>
						<span class="kind small text-secondary">{{ result.entry.kind }}</span>
					</button>
				} @empty {
					<div class="px-2 py-1 small text-secondary">Nothing found. Coordinates work too: X Y.</div>
				}
			</div>
		}
	`,
	styles: `
		:host {
			display: block;
			position: relative;
			width: 260px;
			max-width: 100%;
		}
		.search-box {
			position: relative;
		}
		.search-box input {
			padding-left: 1.9rem;
			padding-right: 1.9rem;
			background: var(--bs-body-bg);
			color: var(--bs-body-color);
			border-color: #34475a;
		}
		.search-box input::-webkit-search-cancel-button {
			appearance: none;
		}
		.search-box input::placeholder {
			color: var(--bs-secondary-color);
		}
		.search-icon {
			position: absolute;
			left: 0.6rem;
			top: 50%;
			transform: translateY(-50%);
			pointer-events: none;
			font-size: 0.8rem;
		}
		.clear {
			position: absolute;
			right: 0;
			top: 50%;
			transform: translateY(-50%);
		}
		.results {
			position: absolute;
			top: calc(100% + 4px);
			left: 0;
			right: 0;
			max-height: 320px;
			overflow-y: auto;
			background: var(--bs-body-bg);
			border: 1px solid #34475a;
			padding: 2px 0;
		}
		.result {
			width: 100%;
			border: 0;
			background: none;
			color: inherit;
			text-align: left;
			padding: 4px 8px;
			font-size: 0.875rem;
		}
		.result.active, .result:hover {
			background: rgba(255, 255, 255, 0.08);
		}
		.result-icon {
			flex: none;
			width: 22px;
			height: 22px;
			padding: 2px;
			border: 2px solid;
			border-radius: 50%;
			background: rgba(20, 24, 36, 0.88);
		}
		.result-dot {
			flex: none;
			width: 12px;
			height: 12px;
			margin: 0 5px;
			border-radius: 50%;
			border: 1px solid #111;
		}
		.kind {
			flex: none;
		}
	`,
})
export class MapSearchComponent implements OnChanges
{

	private static readonly MAX_RESULTS = 8;

	/** Grouped thousands ("12,345") or plain numbers; an "X"/"Y" before them is allowed. */
	private static readonly NUMBER = /-?\d{1,3}(?:,\d{3})+(?:\.\d+)?|-?\d+(?:\.\d+)?/g;

	public readonly faMagnifyingGlass = faMagnifyingGlass;
	public readonly faXmark = faXmark;

	@Input() public entries: ReadonlyArray<MapSearchEntry> = [];
	/** Typed coordinates are read in the units the map shows. */
	@Input() public coordinates = new MapCoordinateFormatter();
	@Output() public readonly pick = new EventEmitter<MapSearchEntry>();
	@Output() public readonly cleared = new EventEmitter<void>();
	@Output() public readonly activated = new EventEmitter<void>();

	@ViewChild('input', {static: true}) private input!: ElementRef<HTMLInputElement>;

	public readonly query = signal('');
	public readonly focused = signal(false);
	public readonly selected = signal(0);
	private readonly entriesSignal = signal<ReadonlyArray<MapSearchEntry>>([]);
	private readonly coordinatesSignal = signal(new MapCoordinateFormatter());

	public readonly results = computed<MapSearchResult[]>(() => {
		const query = this.query().trim();
		if (query === '') {
			return [];
		}
		const results: MapSearchResult[] = [];
		const point = this.point(query);
		if (point !== null) {
			const label = `X ${Math.round(point[0])}, Y ${Math.round(point[1])}`;
			const coordinates = this.coordinatesSignal();
			const engine: [number, number] = [coordinates.toEngine(point[0]), coordinates.toEngine(point[1])];
			results.push({
				entry: {id: 'point', label, detail: 'Go to these coordinates', kind: 'Place', color: '#fff', iconUrl: null, action: {type: 'points', points: [engine]}},
				fragments: [{text: label, match: false}],
			});
		}
		const matches = this.entriesSignal()
			.map(entry => ({entry, match: this.matcher.match(query, entry.label, entry.detail)}))
			.filter(item => item.match !== null)
			.sort((a, b) => b.match!.score - a.match!.score || a.entry.label.localeCompare(b.entry.label))
			.slice(0, MapSearchComponent.MAX_RESULTS);
		results.push(...matches.map(item => ({entry: item.entry, fragments: item.match!.nameFragments})));
		return results;
	});

	public readonly open = computed(() => this.focused() && this.query().trim() !== '');

	public constructor(
		private readonly matcher: TextMatcher,
		private readonly host: ElementRef<HTMLElement>,
	)
	{
	}

	public ngOnChanges(): void
	{
		this.entriesSignal.set(this.entries);
		this.coordinatesSignal.set(this.coordinates);
	}

	@HostListener('document:pointerdown', ['$event'])
	public onDocumentPointer(event: PointerEvent): void
	{
		if (!this.host.nativeElement.contains(event.target as Node)) {
			this.focused.set(false);
		}
	}

	public onFocus(): void
	{
		this.focused.set(true);
		this.activated.emit();
	}

	public onInput(value: string): void
	{
		this.query.set(value);
		this.selected.set(0);
		this.focused.set(true);
	}

	public onKeyDown(event: KeyboardEvent): void
	{
		const count = this.results().length;
		if (event.key === 'ArrowDown' && count > 0) {
			this.selected.update(index => (index + 1) % count);
		} else if (event.key === 'ArrowUp' && count > 0) {
			this.selected.update(index => (index - 1 + count) % count);
		} else if (event.key === 'Enter') {
			const result = this.results()[this.selected()];
			if (result !== undefined) {
				this.choose(result.entry);
			}
		} else if (event.key === 'Escape') {
			// The map page also takes Escape as "back to the planner".
			if (this.query() !== '') {
				this.clear();
			} else {
				this.input.nativeElement.blur();
				this.focused.set(false);
			}
		} else {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
	}

	public choose(entry: MapSearchEntry): void
	{
		this.focused.set(false);
		this.input.nativeElement.blur();
		this.pick.emit(entry);
	}

	public clear(): void
	{
		this.query.set('');
		this.cleared.emit();
	}

	private point(query: string): [number, number] | null
	{
		// Any letter but the X and Y of a pasted readout means a name.
		if (/[a-wz]/i.test(query)) {
			return null;
		}
		const numbers = query.match(MapSearchComponent.NUMBER);
		if (numbers === null || numbers.length !== 2) {
			return null;
		}
		const [x, y] = numbers.map(number => parseFloat(number.replace(/,/g, '')));
		return isFinite(x) && isFinite(y) ? [x, y] : null;
	}

}
