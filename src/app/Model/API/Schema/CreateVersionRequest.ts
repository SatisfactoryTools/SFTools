import {WorldDataPayload} from '@src/Model/API/Schema/World/WorldDataPayload';

export interface CreateVersionRequest
{

	base: string;
	recipeCost?: number;
	powerCost?: number;
	name?: string;
	mods?: string[];
	worldData?: WorldDataPayload;

}
