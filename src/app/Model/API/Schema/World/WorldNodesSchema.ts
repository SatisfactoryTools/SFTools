import {WorldDataMode} from '@src/Model/API/Schema/World/WorldDataMode';
import {WorldDataPurity} from '@src/Model/API/Schema/World/WorldDataPurity';
import {WorldFrackingCoreSchema} from '@src/Model/API/Schema/World/WorldFrackingCoreSchema';
import {WorldPurityNodeSchema} from '@src/Model/API/Schema/World/WorldPurityNodeSchema';
import {WorldResourceNodeSchema} from '@src/Model/API/Schema/World/WorldResourceNodeSchema';

export interface WorldNodesSchema
{
	gameVersion: string | null;
	/** The settings the world was generated with; files from before they were written lack them. */
	seed?: number;
	mode?: WorldDataMode;
	puritySettings?: WorldDataPurity;
	resourceNodes: WorldResourceNodeSchema[];
	geysers: WorldPurityNodeSchema[];
	frackingCores: WorldFrackingCoreSchema[];
}
