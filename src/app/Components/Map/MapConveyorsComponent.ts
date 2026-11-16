import {ChangeDetectionStrategy, Component} from '@angular/core';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {MapPlanSettingsService} from '@src/Components/Map/MapPlanSettingsService';
import {MapResourceAreaService} from '@src/Components/Map/MapResourceAreaService';
import {ConveyorTiers} from '@src/Model/Map/ConveyorTiers';
import {MinerTiers} from '@src/Model/Map/MinerTiers';
import {WorldLimitsCalculator} from '@src/Model/Data/WorldLimitsCalculator';

/** One choice for every map tool: what a node gives depends on the miner and on the conveyor that carries it away. */
@Component({
	selector: 'map-conveyors',
	templateUrl: './MapConveyorsComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [BsDropdownModule, AppTooltipDirective],
	styles: `
		:host {
			display: inline-flex;
		}
		.conveyor-label {
			opacity: 0.7;
		}
	`,
})
export class MapConveyorsComponent
{

	public readonly belts = ConveyorTiers.BELTS;
	public readonly pipes = ConveyorTiers.PIPES;

	/** What a pure node gives at 250% with each miner, the figure players usually compare. */
	public readonly miners: number[];

	public constructor(
		public readonly planSettings: MapPlanSettingsService,
		private readonly areas: MapResourceAreaService,
		limits: WorldLimitsCalculator,
	)
	{
		this.miners = MinerTiers.MULTIPLIERS.map(multiplier => limits.nodeRate('pure', true, false, Infinity, Infinity, multiplier));
	}

	public get minerMark(): number
	{
		return this.planSettings.conveyors().minerMark ?? MinerTiers.MULTIPLIERS.length;
	}

	public setMiner(minerMark: number): void
	{
		this.areas.setConveyors({...this.planSettings.conveyors(), minerMark});
	}

	public setBelt(beltMark: number): void
	{
		this.areas.setConveyors({...this.planSettings.conveyors(), beltMark});
	}

	public setPipe(pipeMark: number): void
	{
		this.areas.setConveyors({...this.planSettings.conveyors(), pipeMark});
	}

}
