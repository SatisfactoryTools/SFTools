import {CollectibleSchema} from '@src/Model/API/Schema/World/CollectibleSchema';

export interface CollectiblesSchema
{
	gameVersion: string;
	pickups: CollectibleSchema[];
	dropPods: CollectibleSchema[];
	creatureSpawners: CollectibleSchema[];
}
