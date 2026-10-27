import {FactorySiteGrid} from '@src/Model/Map/FactorySite/FactorySiteGrid';
import {FactorySiteSpot} from '@src/Model/Map/FactorySite/FactorySiteSpot';
import {MapImageOverlay} from '@src/Model/Map/MapImageOverlay';

/** Colours are relative: the best spot is green and the 95th percentile and worse red, so the contrast sits where the choice is. */
export class FactorySitePainter
{

	private static readonly HIGH_PERCENTILE = 0.95;

	private static readonly STOPS: ReadonlyArray<readonly [number, number, number]> = [
		[46, 204, 64],
		[255, 220, 0],
		[255, 65, 54],
	];

	/** Best spots this far apart (a share of the map's width), so the three are real alternatives. */
	private static readonly SPOT_SPACING = 0.12;

	private static readonly SPOT_COUNT = 3;

	public paint(grid: FactorySiteGrid, scores: Float32Array): MapImageOverlay
	{
		const values = Array.from(scores).filter(score => !Number.isNaN(score)).sort((a, b) => a - b);
		const low = values[0] ?? 0;
		const high = values[Math.floor((values.length - 1) * FactorySitePainter.HIGH_PERCENTILE)] ?? low;
		const range = high - low;

		const canvas = document.createElement('canvas');
		canvas.width = grid.columns;
		canvas.height = grid.rows;
		const context = canvas.getContext('2d')!;
		const image = context.createImageData(grid.columns, grid.rows);
		for (let i = 0; i < scores.length; i++) {
			const score = scores[i];
			if (Number.isNaN(score)) {
				continue;
			}
			const [r, g, b] = this.color(range > 0 ? Math.min(1, (score - low) / range) : 0);
			image.data[i * 4] = r;
			image.data[i * 4 + 1] = g;
			image.data[i * 4 + 2] = b;
			image.data[i * 4 + 3] = 255;
		}
		context.putImageData(image, 0, 0);
		return {
			url: canvas.toDataURL(),
			minX: grid.minX,
			minY: grid.minY,
			maxX: grid.minX + grid.columns * grid.cellSize,
			maxY: grid.minY + grid.rows * grid.cellSize,
		};
	}

	public spots(grid: FactorySiteGrid, scores: Float32Array): FactorySiteSpot[]
	{
		const order = Array.from(scores.keys())
			.filter(index => !Number.isNaN(scores[index]))
			.sort((a, b) => scores[a] - scores[b]);
		const spacing = grid.columns * grid.cellSize * FactorySitePainter.SPOT_SPACING;
		const spots: FactorySiteSpot[] = [];
		for (const index of order) {
			const x = grid.minX + (index % grid.columns + 0.5) * grid.cellSize;
			const y = grid.minY + (Math.floor(index / grid.columns) + 0.5) * grid.cellSize;
			if (spots.every(spot => Math.hypot(spot.x - x, spot.y - y) >= spacing)) {
				spots.push({x, y, score: scores[index]});
				if (spots.length === FactorySitePainter.SPOT_COUNT) {
					break;
				}
			}
		}
		return spots;
	}

	private color(t: number): readonly [number, number, number]
	{
		const stops = FactorySitePainter.STOPS;
		const position = t * (stops.length - 1);
		const index = Math.min(stops.length - 2, Math.floor(position));
		const local = position - index;
		const [a, b] = [stops[index], stops[index + 1]];
		return [
			Math.round(a[0] + (b[0] - a[0]) * local),
			Math.round(a[1] + (b[1] - a[1]) * local),
			Math.round(a[2] + (b[2] - a[2]) * local),
		];
	}

}
