import {WorldDataMode} from '@src/Model/API/Schema/World/WorldDataMode';
import {WorldDataPreview} from '@src/Model/API/Schema/World/WorldDataPreview';
import {WorldDataPurity} from '@src/Model/API/Schema/World/WorldDataPurity';

export interface WorldDataPayload
{
	seed?: number;
	mode?: WorldDataMode;
	purity?: WorldDataPurity;
	nodes?: WorldDataPreview;
	limits?: Record<string, number>;
}
