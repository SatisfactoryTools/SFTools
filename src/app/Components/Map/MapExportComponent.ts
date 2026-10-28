import {ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faXmark} from '@fortawesome/free-solid-svg-icons';
import {MapImageExporter} from '@src/Model/Map/MapImageExporter';

@Component({
	selector: 'map-export',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, FormsModule],
	template: `
		<div class="d-flex align-items-center gap-2 ps-3 pe-1 py-1 border-bottom header">
			<span class="fw-semibold flex-grow-1">Export a picture</span>
			<button type="button" class="btn btn-link btn-sm text-reset" aria-label="Close export" (click)="closed.emit()">
				<fa-icon [icon]="faXmark"></fa-icon>
			</button>
		</div>
		<div class="px-3 py-2 d-flex flex-column gap-2">
			<div>
				<div class="form-check">
					<input class="form-check-input" type="radio" name="map-export-scope" id="map-export-view" value="view" [(ngModel)]="scope"/>
					<label class="form-check-label" for="map-export-view">What the map shows now</label>
				</div>
				<div class="form-check">
					<input class="form-check-input" type="radio" name="map-export-scope" id="map-export-whole" value="whole" [(ngModel)]="scope"/>
					<label class="form-check-label" for="map-export-whole">The whole map</label>
				</div>
			</div>
			<label class="d-flex align-items-center gap-2 small">
				<span>Width</span>
				<select class="form-select form-select-sm w-auto" [(ngModel)]="width">
					@for (option of widths(); track option) {
						<option [ngValue]="option">{{ option }} px</option>
					}
				</select>
			</label>
			<div class="small text-secondary">Shows the layers that are on, with symbols for the nodes.</div>
			<button type="button" class="btn btn-sm btn-primary align-self-end" [disabled]="busy" (click)="run()">
				@if (busy) {
					<span class="spinner-border spinner-border-sm me-1" role="status"></span>
				}
				Export PNG
			</button>
		</div>
	`,
	styles: `
		:host {
			display: block;
			width: 280px;
			overflow-y: auto;
			overscroll-behavior: contain;
			background: var(--bs-body-bg);
			border: 1px solid #34475a;
			font-size: 0.875rem;
		}
		.header {
			border-color: #34475a !important;
		}
	`,
})
export class MapExportComponent implements OnChanges
{

	public readonly faXmark = faXmark;

	@Input() public viewWidth = 1000;
	@Input() public busy = false;
	@Output() public readonly exported = new EventEmitter<{scope: 'view' | 'whole'; width: number}>();
	@Output() public readonly closed = new EventEmitter<void>();

	private scopeValue: 'view' | 'whole' = 'view';
	public width = 0;

	public get scope(): 'view' | 'whole'
	{
		return this.scopeValue;
	}

	public set scope(scope: 'view' | 'whole')
	{
		this.scopeValue = scope;
		this.width = this.defaultWidth();
	}

	public ngOnChanges(): void
	{
		if (!this.widths().includes(this.width)) {
			this.width = this.defaultWidth();
		}
	}

	public widths(): number[]
	{
		const options = this.scope === 'view'
			? [1, 2, 4].map(factor => Math.round(this.viewWidth * factor))
			: [2048, 4096, 8192];
		return options.filter(option => option > 0 && option <= MapImageExporter.MAX_SIDE);
	}

	/** Twice the screen for the view, so text stays sharp; 4096 for the whole map. */
	private defaultWidth(): number
	{
		const widths = this.widths();
		return widths[Math.min(1, widths.length - 1)] ?? 2048;
	}

	public run(): void
	{
		this.exported.emit({scope: this.scope, width: this.width});
	}

}
