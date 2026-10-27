import {Injectable} from '@angular/core';
import {FactorySiteGrid} from '@src/Model/Map/FactorySite/FactorySiteGrid';
import {MapBackground} from '@src/Model/Map/MapBackground';

/** Cells over the black margin around the world get no colour: nothing can be built there. */
@Injectable({providedIn: 'root'})
export class FactorySiteMaskLoader
{

	private static readonly BLACK_LEVEL = 12;

	private readonly cache = new Map<string, Promise<Uint8Array | null>>();

	public load(background: MapBackground, grid: FactorySiteGrid): Promise<Uint8Array | null>
	{
		const key = `${background.id}|${grid.columns}x${grid.rows}`;
		let mask = this.cache.get(key);
		if (mask === undefined) {
			mask = this.read(background, grid);
			this.cache.set(key, mask);
		}
		return mask;
	}

	/** A mask that cannot be read only costs looks, so it falls back to none. */
	private read(background: MapBackground, grid: FactorySiteGrid): Promise<Uint8Array | null>
	{
		return new Promise(resolve => {
			const image = new Image();
			image.crossOrigin = 'anonymous';
			image.onload = () => {
				try {
					resolve(this.sample(image, background, grid));
				} catch {
					resolve(null);
				}
			};
			image.onerror = () => resolve(null);
			image.src = background.overviewUrl;
		});
	}

	private sample(image: HTMLImageElement, background: MapBackground, grid: FactorySiteGrid): Uint8Array
	{
		const canvas = document.createElement('canvas');
		canvas.width = grid.columns;
		canvas.height = grid.rows;
		const context = canvas.getContext('2d', {willReadFrequently: true})!;
		// The grid can reach past the image on its far edges; scale the image to the part it covers.
		const world = background.world;
		context.drawImage(
			image,
			0, 0,
			(world.maxX - world.minX) / grid.cellSize,
			(world.maxY - world.minY) / grid.cellSize,
		);
		const pixels = context.getImageData(0, 0, grid.columns, grid.rows).data;
		const mask = new Uint8Array(grid.columns * grid.rows);
		for (let i = 0; i < mask.length; i++) {
			const level = Math.max(pixels[i * 4], pixels[i * 4 + 1], pixels[i * 4 + 2]);
			mask[i] = pixels[i * 4 + 3] > 0 && level > FactorySiteMaskLoader.BLACK_LEVEL ? 1 : 0;
		}
		return mask;
	}

}
