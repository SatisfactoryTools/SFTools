import {Directive, input} from '@angular/core';
import {ComponentLoaderFactory} from 'ngx-bootstrap/component-loader';
import {PositioningService} from 'ngx-bootstrap/positioning';
import {TooltipDirective} from 'ngx-bootstrap/tooltip';

/**
 * The ngx-bootstrap tooltip, kept inside the window.
 *
 * Out of the box a tooltip is only pushed back inside its trigger's nearest
 * scrolling ancestor, which in this app is usually a panel a few hundred
 * pixels wide - a tooltip wider than the panel then gets squeezed against its
 * own trigger. The window is the boundary that actually matters, so every
 * tooltip in the app uses this directive instead of the library one and the
 * label stays on screen no matter where the trigger sits.
 */
@Directive({
	selector: '[tooltip], [tooltipHtml]',
	exportAs: 'bs-tooltip',
	providers: [ComponentLoaderFactory, PositioningService],
})
export class AppTooltipDirective extends TooltipDirective
{

	public override readonly boundariesElement = input<'viewport' | 'scrollParent' | 'window' | undefined>('viewport');

}
