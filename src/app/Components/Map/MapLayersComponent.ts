import {ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output} from '@angular/core';
import {NgTemplateOutlet} from '@angular/common';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronDown, faXmark} from '@fortawesome/free-solid-svg-icons';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {MapMarkerSwatchComponent} from '@src/Components/Map/MapMarkerSwatchComponent';
import {MapCategory} from '@src/Model/Map/MapCategory';
import {MapCategoryGroup} from '@src/Model/Map/MapCategoryGroup';
import {MapLayer} from '@src/Model/Map/MapLayer';
import {MapCategoryPurity} from '@src/Model/Map/MapCategoryPurity';
import {MapLayerState} from '@src/Model/Map/MapLayerState';
import {MapPurity} from '@src/Model/Map/MapPurity';

@Component({
	selector: 'map-layers',
	templateUrl: './MapLayersComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [NgTemplateOutlet, FaIconComponent, AppTooltipDirective, MapMarkerSwatchComponent],
	styles: `
		:host {
			display: flex;
			flex-direction: column;
			width: 410px;
			container: layers / inline-size;
			background: var(--bs-body-bg);
			border: 1px solid #34475a;
		}
		.layers-header {
			flex: none;
			border-bottom: 1px solid #34475a;
		}
		.layers-body {
			overflow-y: auto;
			overscroll-behavior: contain;
		}
		/* One grid for the whole panel, so counts and fold buttons line up across every layer and list. */
		.layers-body {
			display: grid;
			grid-template-columns: 2.4rem minmax(0, 1fr) auto minmax(2.5rem, auto) 1.75rem;
			column-gap: 0.4rem;
			align-content: start;
			padding: 0.25rem 0.75rem 0.5rem 0.75rem;
		}
		.layer, .layer-list, .grid-row {
			grid-column: 1 / -1;
			display: grid;
			grid-template-columns: subgrid;
			align-items: center;
		}
		.layer {
			padding: 0.2rem 0;
		}
		/* Layers without purity columns give their names that room. */
		.wide {
			grid-column: 2 / 4;
		}
		.layer + .layer {
			border-top: 1px solid #2b3a4a;
		}
		.layer-row {
			min-height: 2.4rem;
		}
		.layer-list {
			padding: 0.15rem 0 0.25rem 0;
		}
		.layer-off .layer-list, .layer-off .purities {
			opacity: 0.55;
		}
		.category-row, .group-row {
			min-height: 1.75rem;
		}
		.category-row:hover, .group-row:hover {
			background: rgba(255, 255, 255, 0.04);
		}
		.switch {
			display: flex;
			align-items: center;
			padding: 0;
			margin: 0;
			min-height: 0;
		}
		.switch .form-check-input {
			float: none;
			width: 2.2em;
			height: 1.2em;
			margin: 0;
			cursor: pointer;
		}
		.layer-label {
			cursor: pointer;
			font-weight: 500;
		}
		.item-label {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			min-width: 0;
			cursor: pointer;
		}
		/* Bootstrap aligns checkboxes to the text top; centred on the row they line up with the names. */
		.form-check-input {
			flex: none;
			margin: 0;
		}
		.group-label {
			font-size: 0.75rem;
			text-transform: uppercase;
			letter-spacing: 0.04em;
			color: var(--bs-secondary-color);
		}
		.purities {
			display: flex;
			height: 100%;
		}
		.purity {
			width: 1.9rem;
			display: flex;
			align-items: center;
			justify-content: center;
		}
		.purity-head {
			flex-direction: column;
			gap: 0.2rem;
			cursor: pointer;
		}
		.count {
			text-align: right;
			white-space: nowrap;
			font-variant-numeric: tabular-nums;
		}
		.fold {
			display: flex;
			justify-content: flex-end;
		}
		.fold-btn {
			width: 1.75rem;
			height: 1.75rem;
			padding: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 0.85rem;
			color: #cfd6de;
		}
		.fold-btn fa-icon {
			transition: transform 0.15s;
		}
		.fold-btn fa-icon.flipped {
			transform: rotate(180deg);
		}
		@container layers (max-width: 360px) {
			.layers-body {
				grid-template-columns: 2.2rem minmax(0, 1fr) auto minmax(2rem, auto) 1.75rem;
				column-gap: 0.25rem;
				padding-left: 0.5rem;
				padding-right: 0.5rem;
			}
			.purity {
				width: 1.6rem;
			}
			.item-label {
				gap: 0.35rem;
			}
		}
		.list-loading {
			grid-column: 2 / -1;
			min-height: 1.75rem;
			display: flex;
			align-items: center;
			gap: 0.5rem;
		}
		.marker-icon {
			width: 22px;
			height: 22px;
			flex: none;
			padding: 1px;
			border: 2px solid;
			border-radius: 50%;
			background: #141824;
		}
	`,
})
export class MapLayersComponent implements OnChanges
{

	public readonly faXmark = faXmark;
	public readonly faChevronDown = faChevronDown;

	/** Static: the panel is destroyed when closed, and reopening it should keep the lists as they were. */
	private static readonly expanded = new Set<string>();

	@Input({required: true}) public layers: MapLayer[] = [];
	@Input({required: true}) public state!: MapLayerState;
	@Output() public readonly stateChange = new EventEmitter<MapLayerState>();
	@Output() public readonly closed = new EventEmitter<void>();
	/** An unfolded list whose markers are not loaded yet. */
	@Output() public readonly listWanted = new EventEmitter<void>();

	public ngOnChanges(): void
	{
		if (this.layers.some(layer => this.isExpanded(layer) && this.isPending(layer))) {
			this.listWanted.emit();
		}
	}

	public toggleLayer(layer: MapLayer, event: Event): void
	{
		this.stateChange.emit(this.state.withLayer(layer.id, (event.target as HTMLInputElement).checked));
	}

	public setIds(ids: ReadonlyArray<string>, shown: boolean): void
	{
		this.stateChange.emit(this.state.withShown(ids, shown));
	}

	public setSymbols(symbols: boolean): void
	{
		if (symbols !== this.state.symbols) {
			this.stateChange.emit(this.state.withSymbols(symbols));
		}
	}

	public groupIds(group: MapCategoryGroup): string[]
	{
		return group.categories.flatMap(category => category.ids);
	}

	/** The group whose purity columns become the layer's own header row. */
	public columnGroup(layer: MapLayer): MapCategoryGroup | null
	{
		return layer.groups.find(group => group.columns.length > 0) ?? null;
	}

	public hasList(layer: MapLayer): boolean
	{
		return layer.listed;
	}

	/** Unfolded before its markers came in. */
	public isPending(layer: MapLayer): boolean
	{
		return layer.listed && layer.count === null;
	}

	public isExpanded(layer: MapLayer): boolean
	{
		return MapLayersComponent.expanded.has(layer.id);
	}

	public toggleExpanded(layer: MapLayer): void
	{
		if (!MapLayersComponent.expanded.delete(layer.id)) {
			MapLayersComponent.expanded.add(layer.id);
			if (this.isPending(layer)) {
				this.listWanted.emit();
			}
		}
	}

	public purityOf(category: MapCategory, purity: MapPurity): MapCategoryPurity | undefined
	{
		return category.purities.find(entry => entry.purity === purity);
	}

}
