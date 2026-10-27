import {MapMarkerShape} from '@src/Model/Map/MapMarkerShape';

/** SVG paths in a 20×20 box: more corners for a purer node, so purity reads without colour. */
export class MapMarkerShapes
{

	private static readonly PATHS: Record<MapMarkerShape, string> = {
		impure: 'M10 2.5 L18 16.5 L2 16.5 Z',
		normal: 'M10 1.5 L18.5 10 L10 18.5 L1.5 10 Z',
		pure: MapMarkerShapes.star(10, 10.6, 9.2, 4),
		circle: 'M10 3 A7 7 0 1 1 9.99 3 Z',
	};

	public path(shape: MapMarkerShape): string
	{
		return MapMarkerShapes.PATHS[shape];
	}

	private static star(cx: number, cy: number, outer: number, inner: number): string
	{
		const points: string[] = [];
		for (let i = 0; i < 10; i++) {
			const radius = i % 2 === 0 ? outer : inner;
			const angle = -Math.PI / 2 + i * Math.PI / 5;
			points.push(`${(cx + radius * Math.cos(angle)).toFixed(2)} ${(cy + radius * Math.sin(angle)).toFixed(2)}`);
		}
		return `M${points.join(' L')} Z`;
	}

}
