import {ExportBox} from '@src/Model/Export/ExportBox';
import {GraphSvgSnapshot} from '@src/Model/Export/GraphSvgSnapshot';
import {RasterSource} from '@src/Model/Export/RasterSource';

export class SnapshotRasterSource implements RasterSource
{

	public constructor(
		private readonly snapshot: GraphSvgSnapshot,
		public readonly box: ExportBox,
		private readonly background: string | null,
	)
	{
	}

	public render(box: ExportBox): string
	{
		return this.snapshot.render(box, this.background);
	}

}
