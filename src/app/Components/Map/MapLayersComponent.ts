import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {NgTemplateOutlet} from '@angular/common';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faXmark} from '@fortawesome/free-solid-svg-icons';
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
			width: 380px;
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
		.group-label {
			font-size: 0.75rem;
			text-transform: uppercase;
			letter-spacing: 0.04em;
		}
		.category {
			min-height: 1.6rem;
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
		.category-table {
			width: calc(100% - 1.5rem);
			border-collapse: collapse;
			table-layout: fixed;
		}
		.category-table th {
			font-weight: 400;
			padding-bottom: 4px;
			vertical-align: bottom;
		}
		.category-table td {
			height: 1.75rem;
			vertical-align: middle;
		}
		.category-table td .form-check-input {
			margin-top: 0;
		}
		.category-table .check {
			width: 1.6rem;
		}
		.category-table .purity {
			width: 1.9rem;
			text-align: center;
		}
		.category-table .count {
			width: 2.4rem;
			text-align: right;
		}
		.category-table .name label {
			min-width: 0;
		}
		.count {
			font-variant-numeric: tabular-nums;
		}
	`,
})
export class MapLayersComponent
{

	public readonly faXmark = faXmark;

	@Input({required: true}) public layers: MapLayer[] = [];
	@Input({required: true}) public state!: MapLayerState;
	@Output() public readonly stateChange = new EventEmitter<MapLayerState>();
	@Output() public readonly closed = new EventEmitter<void>();

	public toggleLayer(layer: MapLayer, event: Event): void
	{
		this.stateChange.emit(this.state.withLayer(layer.id, (event.target as HTMLInputElement).checked));
	}

	public setIds(ids: ReadonlyArray<string>, shown: boolean): void
	{
		this.stateChange.emit(this.state.withShown(ids, shown));
	}

	public setGroup(group: MapCategoryGroup, shown: boolean): void
	{
		this.setIds(this.groupIds(group), shown);
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

	public purityOf(category: MapCategory, purity: MapPurity): MapCategoryPurity | undefined
	{
		return category.purities.find(entry => entry.purity === purity);
	}

}
