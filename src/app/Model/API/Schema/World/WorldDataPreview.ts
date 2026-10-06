import {FrackingCoreCounts} from '@src/Model/API/Schema/World/FrackingCoreCounts';
import {PurityCounts} from '@src/Model/API/Schema/World/PurityCounts';
import {WorldDataMode} from '@src/Model/API/Schema/World/WorldDataMode';
import {WorldDataPurity} from '@src/Model/API/Schema/World/WorldDataPurity';

export interface WorldDataPreview
{
	gameVersion: string;
	seed: number;
	mode: WorldDataMode;
	purity: WorldDataPurity;
	resourceNodes: Record<string, PurityCounts>;
	geysers: PurityCounts;
	frackingCores: Record<string, FrackingCoreCounts>;
}
