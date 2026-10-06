import {GraphExportFormat} from '@src/Model/Export/GraphExportFormat';

export interface GraphExportOptions
{
	readonly format: GraphExportFormat;
	readonly background: boolean;
	/** PNG only: image pixels per graph unit. */
	readonly scale: number;
}
