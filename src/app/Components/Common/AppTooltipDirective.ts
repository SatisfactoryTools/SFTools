import {Directive, input} from '@angular/core';
import {ComponentLoaderFactory} from 'ngx-bootstrap/component-loader';
import {PositioningService} from 'ngx-bootstrap/positioning';
import {TooltipDirective} from 'ngx-bootstrap/tooltip';

/** Replaces the library tooltip app-wide: out of the box a tooltip is only kept inside its nearest scrolling ancestor (usually a narrow panel), so wide labels got squeezed against their trigger. The window is the boundary here. */
@Directive({
	selector: '[tooltip], [tooltipHtml]',
	exportAs: 'bs-tooltip',
	providers: [ComponentLoaderFactory, PositioningService],
})
export class AppTooltipDirective extends TooltipDirective
{

	public override readonly boundariesElement = input<'viewport' | 'scrollParent' | 'window' | undefined>('viewport');

}
