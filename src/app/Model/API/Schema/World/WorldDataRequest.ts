import {WorldDataMode} from '@src/Model/API/Schema/World/WorldDataMode';
import {WorldDataPurity} from '@src/Model/API/Schema/World/WorldDataPurity';

/** Body of POST /v1/versions/world-data. */
export interface WorldDataRequest
{
	/** 32-bit signed integer; default 0. */
	seed?: number;
	mode?: WorldDataMode;
	purity?: WorldDataPurity;
}
