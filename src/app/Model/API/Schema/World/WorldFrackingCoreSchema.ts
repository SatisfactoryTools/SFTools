import {WorldPurityNodeSchema} from '@src/Model/API/Schema/World/WorldPurityNodeSchema';

export interface WorldFrackingCoreSchema
{
	name: string;
	resource: string;
	location: [number, number, number];
	satellites: WorldPurityNodeSchema[];
}
