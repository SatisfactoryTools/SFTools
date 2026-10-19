import {Inject, Injectable, PLATFORM_ID, RendererFactory2} from '@angular/core';
import {PlacementForBs5, PositioningService} from 'ngx-bootstrap/positioning';

/** ngx-bootstrap positions a dropdown exactly at its placement and never looks at the window, so a menu near the bottom of a panel runs off screen; tooltips only behave because their directive enables flip/overflow in a service of its own, so this does the same for the root service the dropdowns share. */
@Injectable()
export class AppPositioningService extends PositioningService
{

	public constructor(rendererFactory: RendererFactory2, @Inject(PLATFORM_ID) platformId: number)
	{
		super(rendererFactory, platformId);
		AppPositioningService.completePlacementTable();
		this.setOptions({
			allowedPositions: ['top', 'bottom'],
			modifiers: {
				flip: {enabled: true},
				preventOverflow: {enabled: true, boundariesElement: 'viewport'},
			},
		});
	}

	// When a menu fits neither above nor below, flip falls back to the largest free side (ignoring allowedPositions) and keeps the
	// menu's 'left'/'right' variation, so it asks for e.g. 'left left' - a placement the BS5 table lacks, and the class update then crashes.
	private static completePlacementTable(): void
	{
		const table = PlacementForBs5 as unknown as Record<string, string>;
		for (const side of ['top', 'bottom', 'left', 'right']) {
			for (const variation of ['top', 'bottom', 'left', 'right']) {
				table[`${side} ${variation}`] ??= table[side];
			}
		}
	}

}
