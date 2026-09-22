import {Injectable} from '@angular/core';
import {TooltipConfig} from 'ngx-bootstrap/tooltip';

/**
 * App-wide tooltip defaults. Renders into <body> so panels never clip
 * tooltips. Adaptive positioning stays on so a tooltip that would not fit
 * flips to the other side of its trigger and is pushed back inside the
 * window; the boundary it is kept inside comes from AppTooltipDirective.
 */
@Injectable()
export class AppTooltipConfig extends TooltipConfig
{

	public constructor()
	{
		super();
		this.container = 'body';
	}

}
