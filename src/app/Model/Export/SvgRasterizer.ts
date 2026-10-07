import {Injectable} from '@angular/core';
import {ExportBox} from '@src/Model/Export/ExportBox';
import {RasterSize} from '@src/Model/Export/RasterSize';
import {RasterSource} from '@src/Model/Export/RasterSource';

@Injectable({providedIn: 'root'})
export class SvgRasterizer
{

	/** Canvas limits common to current browsers; beyond them drawing fails or returns a blank image. */
	public static readonly MAX_SIDE = 16384;
	public static readonly MAX_AREA = 100_000_000;

	/**
	 * Browsers rasterise an SVG image at the size it is drawn, on the GPU. One picture over the texture limit
	 * (or a large one on a low-memory GPU) loses the graphics context, which clears the canvas to transparent
	 * without any error. Pieces this small always draw.
	 */
	private static readonly TILE = 4096;

	public fits(size: RasterSize): boolean
	{
		return size.width <= SvgRasterizer.MAX_SIDE
			&& size.height <= SvgRasterizer.MAX_SIDE
			&& size.width * size.height <= SvgRasterizer.MAX_AREA;
	}

	public async toBlob(source: RasterSource, size: RasterSize): Promise<Blob>
	{
		const canvas = await this.draw(source, size);
		return new Promise<Blob>((resolve, reject) => {
			canvas.toBlob(blob => {
				if (blob === null) {
					reject(new Error('The image could not be encoded.'));
				} else {
					resolve(blob);
				}
			}, 'image/png');
		});
	}

	public async toDataUrl(source: RasterSource, size: RasterSize): Promise<string>
	{
		const canvas = await this.draw(source, size);
		return canvas.toDataURL('image/png');
	}

	private async draw(source: RasterSource, size: RasterSize): Promise<HTMLCanvasElement>
	{
		if (!this.fits(size)) {
			throw new Error('The image is too large for the browser to draw.');
		}
		const canvas = document.createElement('canvas');
		canvas.width = size.width;
		canvas.height = size.height;
		// willReadFrequently keeps the canvas in main memory, so the full-size picture never has to fit a GPU texture.
		const context = canvas.getContext('2d', {willReadFrequently: true});
		if (context === null) {
			throw new Error('The image could not be drawn.');
		}

		const scaleX = size.width / source.box.width;
		const scaleY = size.height / source.box.height;
		for (let top = 0; top < size.height; top += SvgRasterizer.TILE) {
			for (let left = 0; left < size.width; left += SvgRasterizer.TILE) {
				const tile: RasterSize = {
					width: Math.min(SvgRasterizer.TILE, size.width - left),
					height: Math.min(SvgRasterizer.TILE, size.height - top),
				};
				const box: ExportBox = {
					x: source.box.x + left / scaleX,
					y: source.box.y + top / scaleY,
					width: tile.width / scaleX,
					height: tile.height / scaleY,
				};
				const image = await this.load(source.render(box), tile);
				context.drawImage(image, left, top, tile.width, tile.height);
			}
		}
		return canvas;
	}

	private load(svg: string, size: RasterSize): Promise<HTMLImageElement>
	{
		const url = URL.createObjectURL(new Blob([svg], {type: 'image/svg+xml;charset=utf-8'}));
		return new Promise<HTMLImageElement>((resolve, reject) => {
			const image = new Image(size.width, size.height);
			image.onload = () => {
				URL.revokeObjectURL(url);
				resolve(image);
			};
			image.onerror = () => {
				URL.revokeObjectURL(url);
				reject(new Error('The image could not be rendered.'));
			};
			image.src = url;
		});
	}

}
