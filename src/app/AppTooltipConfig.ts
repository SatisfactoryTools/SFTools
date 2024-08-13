import {Injectable} from '@angular/core';
import {TooltipConfig} from 'ngx-bootstrap/tooltip';

/**
 * App-wide tooltip defaults. Renders into <body> so panels never clip
 * tooltips, and disables adaptive positioning - a tooltip whose trigger sits
 * inside a small scroll container (e.g. a panel tab strip) would otherwise be
 * squeezed into that container and end up covering its own trigger.
 */
@Injectable()
export class AppTooltipConfig extends TooltipConfig
{

	public constructor()
	{
		super();
		this.adaptivePosition = false;
		this.container = 'body';
	}

}
