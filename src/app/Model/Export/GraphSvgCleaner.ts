import {Injectable} from '@angular/core';
import {SvgIconDeduplicator} from '@src/Model/Export/SvgIconDeduplicator';

@Injectable({providedIn: 'root'})
export class GraphSvgCleaner
{

	private static readonly NOISE_PROPERTIES = [
		'cursor', 'pointer-events', 'user-select', '-webkit-user-select', '-webkit-tap-highlight-color',
		'touch-action', 'box-sizing', 'transition', 'transition-property', 'transition-duration',
		'transition-timing-function', 'transition-delay', 'transition-behavior', 'outline', 'outline-color',
		'outline-style', 'outline-width',
	];

	public constructor(private readonly icons: SvgIconDeduplicator)
	{
	}

	public clean(svg: SVGSVGElement): void
	{
		// x6's export clears the transform of the stage, but the pan/zoom matrix sits on the
		// viewport above it; left there, the picture would be offset and scaled by the view.
		svg.querySelectorAll('.x6-graph-svg-viewport').forEach(viewport => {
			viewport.removeAttribute('transform');
			viewport.removeAttribute('style');
		});
		svg.querySelectorAll('.x6-graph-svg-primer, .x6-graph-svg-decorator, .x6-graph-svg-overlay').forEach(layer => layer.remove());
		svg.querySelectorAll('.pg-port, [class*="x6-cell-tool"], [class*="x6-edge-tool"]').forEach(element => element.remove());
		// The hover look is CSS on the live canvas and stays behind; only its marker class comes along.
		svg.querySelectorAll('.pg-edge-hovered').forEach(edge => edge.classList.remove('pg-edge-hovered'));

		svg.querySelectorAll<SVGElement>('[style]').forEach(element => {
			GraphSvgCleaner.NOISE_PROPERTIES.forEach(property => element.style.removeProperty(property));
			if (element.getAttribute('style') === '') {
				element.removeAttribute('style');
			}
		});

		this.icons.apply(svg);
	}

}
