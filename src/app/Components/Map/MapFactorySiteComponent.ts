import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faXmark} from '@fortawesome/free-solid-svg-icons';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {FactorySiteService} from '@src/Components/Map/FactorySiteService';
import {MapSiteCardComponent} from '@src/Components/Map/MapSiteCardComponent';
import {MapTargetSource} from '@src/Components/Map/MapTargetSource';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {FactorySiteExplanation} from '@src/Model/Map/FactorySite/FactorySiteExplanation';
import {FactorySiteMode} from '@src/Model/Map/FactorySite/FactorySiteMode';
import {FactorySiteRow} from '@src/Model/Map/FactorySite/FactorySiteRow';
import {FactorySiteSpot} from '@src/Model/Map/FactorySite/FactorySiteSpot';
import {MapDistanceFormatter} from '@src/Model/Map/MapDistanceFormatter';
import {MapPlanDefaults} from '@src/Model/Map/MapPlanDefaults';
import {RateFormatter} from '@src/Model/RateFormatter';

@Component({
	selector: 'map-factory-site',
	templateUrl: './MapFactorySiteComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, GameIconComponent, InfoNoteComponent, MapSiteCardComponent],
	styles: `
		:host {
			display: flex;
			flex-direction: column;
			width: 360px;
			background: var(--bs-body-bg);
			border: 1px solid #34475a;
		}
		.site-header {
			flex: none;
			border-bottom: 1px solid #34475a;
		}
		.site-body {
			overflow-y: auto;
			overscroll-behavior: contain;
		}
		.site-picked {
			margin: 0 -1rem 0.75rem;
			padding: 0.5rem 1rem 0.75rem;
			border-bottom: 1px solid #34475a;
		}
		.site-label {
			font-size: 0.75rem;
			text-transform: uppercase;
			letter-spacing: 0.04em;
		}
		.site-row {
			display: grid;
			grid-template-columns: minmax(0, 1fr) auto;
			column-gap: 0.75rem;
			align-items: center;
			min-height: 1.75rem;
		}
		.numbers {
			font-variant-numeric: tabular-nums;
		}
		.spot-number {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			width: 1.4rem;
			height: 1.4rem;
			flex: none;
			border-radius: 50%;
			background: #fff;
			color: #111;
			font-weight: 700;
			font-size: 0.75rem;
		}
	`,
})
export class MapFactorySiteComponent
{

	public readonly faXmark = faXmark;

	public readonly fluidFactors = MapPlanDefaults.FLUID_FACTORS;

	public readonly modes: ReadonlyArray<{mode: FactorySiteMode; label: string; description: string}> = [
		{mode: 'farthest', label: 'Farthest node', description: 'How far the farthest node the factory would use is. Every node is at most that far.'},
		{mode: 'sum', label: 'Sum of distances', description: 'The distances to all the nodes the factory would use, added up. One far node costs less than many.'},
	];

	/** The location picked on the map, shown at the top. */
	@Input() public explanation: FactorySiteExplanation | null = null;
	@Input() public saved = false;
	@Input() public spotBlocker: string | null = null;
	/** Off for the saved spot: clearing it would only show it again. */
	@Input() public clearable = true;
	@Output() public readonly spot = new EventEmitter<FactorySiteSpot>();
	@Output() public readonly useSpot = new EventEmitter<void>();
	@Output() public readonly removeSpot = new EventEmitter<void>();
	@Output() public readonly clearSpot = new EventEmitter<void>();
	@Output() public readonly closed = new EventEmitter<void>();

	private readonly distances = new MapDistanceFormatter();

	public constructor(
		public readonly sites: FactorySiteService,
		public readonly targets: MapTargetSource,
		private readonly versionManager: VersionManager,
		private readonly rateFormatter: RateFormatter,
	)
	{
	}

	public get modeDescription(): string
	{
		return this.modes.find(entry => entry.mode === this.sites.options().mode)?.description ?? '';
	}

	public iconHash(row: FactorySiteRow): string | null
	{
		return this.versionManager.activeVersionData()?.iconForClassName(row.className) ?? null;
	}

	public rate(row: FactorySiteRow, amount: number): string
	{
		return this.rateFormatter.rate(amount, this.versionManager.activeVersionData()?.searchItemByClassName(row.className) ?? null);
	}

	public shortfall(row: FactorySiteRow): boolean
	{
		return row.capacity < row.demand;
	}

	public distance(spot: FactorySiteSpot): string
	{
		return this.distances.format(spot.score);
	}

	public setMode(event: Event): void
	{
		this.sites.update({mode: (event.target as HTMLSelectElement).value === 'sum' ? 'sum' : 'farthest'});
	}

	public setFluidCost(event: Event): void
	{
		this.sites.update({fluidCost: (event.target as HTMLInputElement).checked});
	}

	public setFluidFactor(event: Event): void
	{
		this.sites.update({fluidFactor: Number((event.target as HTMLSelectElement).value)});
	}

	public setAreaOnly(event: Event): void
	{
		this.sites.update({areaOnly: (event.target as HTMLInputElement).checked});
	}

}
