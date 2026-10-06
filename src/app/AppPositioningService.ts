import {Inject, Injectable, PLATFORM_ID, RendererFactory2} from '@angular/core';
import {PositioningService} from 'ngx-bootstrap/positioning';

/** ngx-bootstrap positions a dropdown exactly at its placement and never looks at the window, so a menu near the bottom of a panel runs off screen; tooltips only behave because their directive enables flip/overflow in a service of its own, so this does the same for the root service the dropdowns share. */
@Injectable()
export class AppPositioningService extends PositioningService
{

	public constructor(rendererFactory: RendererFactory2, @Inject(PLATFORM_ID) platformId: number)
	{
		super(rendererFactory, platformId);
		this.setOptions({
			allowedPositions: ['top', 'bottom'],
			modifiers: {
				flip: {enabled: true},
				preventOverflow: {enabled: true, boundariesElement: 'viewport'},
			},
		});
	}

}
