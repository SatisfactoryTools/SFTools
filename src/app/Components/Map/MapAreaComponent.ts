import {ChangeDetectionStrategy, Component, EventEmitter, Output} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faDrawPolygon, faTrashCan, faXmark} from '@fortawesome/free-solid-svg-icons';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {MapMarkerSwatchComponent} from '@src/Components/Map/MapMarkerSwatchComponent';
import {MapResourceAreaService} from '@src/Components/Map/MapResourceAreaService';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {ResourceAreaRow} from '@src/Model/Map/ResourceAreaRow';
import {RateFormatter} from '@src/Model/RateFormatter';

@Component({
	selector: 'map-area',
	templateUrl: './MapAreaComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, AppTooltipDirective, GameIconComponent, InfoNoteComponent, MapMarkerSwatchComponent],
	styles: `
		:host {
			display: flex;
			flex-direction: column;
			width: 360px;
			background: var(--bs-body-bg);
			border: 1px solid #34475a;
		}
		.area-header {
			flex: none;
			border-bottom: 1px solid #34475a;
		}
		/* Container-sized: the map can sit in a narrow docked panel. */
		.area-body {
			container-type: inline-size;
			overflow-y: auto;
			overscroll-behavior: contain;
		}
		.area-footer {
			flex: none;
			border-top: 1px solid #34475a;
		}
		.area-grid {
			display: grid;
			grid-template-columns: minmax(0, 1fr) 1.9rem 1.9rem 1.9rem 6.5rem;
			align-items: center;
			min-height: 1.75rem;
		}
		.area-head {
			padding-bottom: 4px;
		}
		.area-grid .count {
			text-align: center;
		}
		.area-grid .limit {
			text-align: right;
			white-space: nowrap;
		}
		.area-grid .name {
			min-width: 0;
		}
		/* Narrow: the name gets its own line, the numbers go under it. */
		@container (max-width: 340px) {
			.area-grid {
				grid-template-columns: 1.9rem 1.9rem 1.9rem minmax(0, 1fr);
			}
			.area-grid .name {
				grid-column: 1 / -1;
			}
			.area-head .name {
				display: none;
			}
			.area-row {
				padding: 2px 0;
				border-bottom: 1px solid #2b3a49;
			}
		}
		.numbers {
			font-variant-numeric: tabular-nums;
		}
	`,
})
export class MapAreaComponent
{

	public readonly faDrawPolygon = faDrawPolygon;
	public readonly faTrashCan = faTrashCan;
	public readonly faXmark = faXmark;

	@Output() public readonly redraw = new EventEmitter<void>();
	@Output() public readonly closed = new EventEmitter<void>();

	public constructor(
		public readonly areas: MapResourceAreaService,
		private readonly versionManager: VersionManager,
		private readonly rateFormatter: RateFormatter,
	)
	{
	}

	public iconHash(row: ResourceAreaRow): string | null
	{
		return this.versionManager.activeVersionData()?.iconForClassName(row.className) ?? null;
	}

	public limitText(row: ResourceAreaRow): string
	{
		if (row.limit === null) {
			return 'Unlimited';
		}
		return this.rateFormatter.rate(row.limit, this.versionManager.activeVersionData()?.searchItemByClassName(row.className) ?? null);
	}

	public setWaterWells(event: Event): void
	{
		this.areas.setWaterWells((event.target as HTMLInputElement).checked);
	}

	public remove(): void
	{
		this.areas.remove();
		this.closed.emit();
	}

}
