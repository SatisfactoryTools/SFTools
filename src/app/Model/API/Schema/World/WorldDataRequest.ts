import {WorldDataMode} from '@src/Model/API/Schema/World/WorldDataMode';
import {WorldDataPurity} from '@src/Model/API/Schema/World/WorldDataPurity';

export interface WorldDataRequest
{
	/** 32-bit signed integer. */
	seed?: number;
	mode?: WorldDataMode;
	purity?: WorldDataPurity;
}
