import {Injectable} from '@angular/core';
import {RasterSize} from '@src/Model/Export/RasterSize';

@Injectable({providedIn: 'root'})
export class SvgRasterizer
{

	/** Canvas limits common to current browsers; beyond them drawing fails or returns a blank image. */
	public static readonly MAX_SIDE = 16384;
	public static readonly MAX_AREA = 100_000_000;

	public fits(size: RasterSize): boolean
	{
		return size.width <= SvgRasterizer.MAX_SIDE
			&& size.height <= SvgRasterizer.MAX_SIDE
			&& size.width * size.height <= SvgRasterizer.MAX_AREA;
	}

	public async toBlob(svg: string, size: RasterSize): Promise<Blob>
	{
		const canvas = await this.draw(svg, size);
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

	public async toDataUrl(svg: string, size: RasterSize): Promise<string>
	{
		const canvas = await this.draw(svg, size);
		return canvas.toDataURL('image/png');
	}

	private async draw(svg: string, size: RasterSize): Promise<HTMLCanvasElement>
	{
		if (!this.fits(size)) {
			throw new Error('The image is too large for the browser to draw.');
		}
		const image = await this.load(svg);
		const canvas = document.createElement('canvas');
		canvas.width = size.width;
		canvas.height = size.height;
		const context = canvas.getContext('2d');
		if (context === null) {
			throw new Error('The image could not be drawn.');
		}
		context.drawImage(image, 0, 0, size.width, size.height);
		return canvas;
	}

	private load(svg: string): Promise<HTMLImageElement>
	{
		const url = URL.createObjectURL(new Blob([svg], {type: 'image/svg+xml;charset=utf-8'}));
		return new Promise<HTMLImageElement>((resolve, reject) => {
			const image = new Image();
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
