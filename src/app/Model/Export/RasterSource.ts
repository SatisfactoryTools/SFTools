import {ExportBox} from '@src/Model/Export/ExportBox';

/** A picture the rasterizer can ask for piece by piece: any part of the box can be rendered as its own SVG. */
export interface RasterSource
{
	readonly box: ExportBox;
	render(box: ExportBox): string;
}
