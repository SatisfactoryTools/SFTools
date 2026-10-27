import {ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Input, Output} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faXmark} from '@fortawesome/free-solid-svg-icons';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {FactorySiteService} from '@src/Components/Map/FactorySiteService';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {FactorySiteExplanation} from '@src/Model/Map/FactorySite/FactorySiteExplanation';
import {FactorySiteResourceUse} from '@src/Model/Map/FactorySite/FactorySiteResourceUse';
import {FactorySiteRow} from '@src/Model/Map/FactorySite/FactorySiteRow';
import {MapCoordinateFormatter} from '@src/Model/Map/MapCoordinateFormatter';
import {MapDistanceFormatter} from '@src/Model/Map/MapDistanceFormatter';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';

/** In a corner rather than a popup on the spot: a popup would hide the lines to the nodes it explains. */
@Component({
	selector: 'map-site-card',
	templateUrl: './MapSiteCardComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, GameIconComponent, AppTooltipDirective],
	styles: `
		:host {
			display: flex;
			flex-direction: column;
			background: var(--bs-body-bg);
			border: 1px solid #34475a;
			font-size: 0.875rem;
		}
		:host(.embedded) {
			background: none;
			border: 0;
		}
		.embedded-header {
			margin-bottom: 4px;
		}
		.embedded-label {
			font-size: 0.75rem;
			text-transform: uppercase;
			letter-spacing: 0.04em;
		}
		.card-header-row {
			flex: none;
			border-bottom: 1px solid #34475a;
		}
		.card-body-scroll {
			overflow-y: auto;
			overscroll-behavior: contain;
		}
		.coordinates {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 4px;
			font-variant-numeric: tabular-nums;
		}
		.coordinates div {
			display: flex;
			flex-direction: column;
			padding: 3px 6px;
			background: rgba(255, 255, 255, 0.05);
			border: 1px solid #34475a;
		}
		.coordinates span {
			font-size: 0.6875rem;
			color: var(--bs-secondary-color);
		}
		.resource {
			display: flex;
			align-items: center;
			gap: 6px;
			min-height: 1.6rem;
			font-variant-numeric: tabular-nums;
		}
		.dot {
			flex: none;
			width: 10px;
			height: 10px;
			border: 1px solid #111;
			border-radius: 50%;
		}
		.name {
			flex: 1;
			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		.detail {
			flex: none;
			color: var(--bs-secondary-color);
			font-size: 0.8125rem;
		}
		.warning {
			padding-left: 16px;
			color: #f0ad4e;
			font-size: 0.75rem;
		}
	`,
})
export class MapSiteCardComponent
{

	public readonly faXmark = faXmark;

	@Input({required: true}) public explanation!: FactorySiteExplanation;
	/** The plan's saved factory spot already is this one. */
	@Input() public saved = false;
	/** Why the spot cannot be saved; null when it can. */
	@Input() public spotBlocker: string | null = null;
	/** Inside the location viability panel, which already has the header and the frame. */
	@HostBinding('class.embedded') @Input() public embedded = false;
	@Input() public clearable = true;
	@Output() public readonly closed = new EventEmitter<void>();
	@Output() public readonly useSpot = new EventEmitter<void>();
	@Output() public readonly removeSpot = new EventEmitter<void>();

	private readonly distances = new MapDistanceFormatter();

	public constructor(
		public readonly sites: FactorySiteService,
		private readonly versionManager: VersionManager,
		private readonly settings: SettingsManager,
	)
	{
	}

	public get scoreText(): string
	{
		return `${this.sites.options().mode === 'farthest' ? 'Farthest node' : 'Sum of distances'}: ${this.distances.format(this.explanation.score)}`;
	}

	public coordinate(value: number): string
	{
		return new MapCoordinateFormatter(this.settings.map().coordinates).format(value);
	}

	public row(use: FactorySiteResourceUse): FactorySiteRow | null
	{
		return this.sites.rows().find(row => row.className === use.className) ?? null;
	}

	public iconHash(use: FactorySiteResourceUse): string | null
	{
		return this.versionManager.activeVersionData()?.iconForClassName(use.className) ?? null;
	}

	public detail(use: FactorySiteResourceUse): string
	{
		const count = use.nodes.length;
		if (count === 0) {
			return 'no nodes';
		}
		const distance = this.sites.options().mode === 'farthest' ? use.farthest : use.total;
		return `${count} ${count === 1 ? 'node' : 'nodes'} · ${this.distances.format(distance)}`;
	}

}
