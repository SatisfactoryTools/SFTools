import {RasterSize} from '@src/Model/Export/RasterSize';

export interface GraphExportScaleOption
{
	readonly scale: number;
	readonly label: string;
	readonly size: RasterSize;
	readonly fits: boolean;
}
