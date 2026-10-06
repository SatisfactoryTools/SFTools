import {Injectable} from '@angular/core';
import {TooltipConfig} from 'ngx-bootstrap/tooltip';

/** Renders into <body> so panels never clip tooltips; the boundary it is kept inside comes from AppTooltipDirective. */
@Injectable()
export class AppTooltipConfig extends TooltipConfig
{

	public constructor()
	{
		super();
		this.container = 'body';
	}

}
