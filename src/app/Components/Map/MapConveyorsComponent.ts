import {ChangeDetectionStrategy, Component} from '@angular/core';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {MapPlanSettingsService} from '@src/Components/Map/MapPlanSettingsService';
import {MapResourceAreaService} from '@src/Components/Map/MapResourceAreaService';
import {ConveyorTiers} from '@src/Model/Map/ConveyorTiers';

/** One choice for every map tool: what a node gives depends on the conveyor that carries it away. */
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

	public constructor(
		public readonly planSettings: MapPlanSettingsService,
		private readonly areas: MapResourceAreaService,
	)
	{
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
