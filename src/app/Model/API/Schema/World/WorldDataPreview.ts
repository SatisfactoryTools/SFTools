import {FrackingCoreCounts} from '@src/Model/API/Schema/World/FrackingCoreCounts';
import {PurityCounts} from '@src/Model/API/Schema/World/PurityCounts';
import {WorldDataMode} from '@src/Model/API/Schema/World/WorldDataMode';
import {WorldDataPurity} from '@src/Model/API/Schema/World/WorldDataPurity';

/** Response of POST /v1/versions/world-data - node counts only, no locations. */
export interface WorldDataPreview
{
	gameVersion: string;
	seed: number;
	mode: WorldDataMode;
	purity: WorldDataPurity;
	/** Solid miner nodes, keyed by resource class name. */
	resourceNodes: Record<string, PurityCounts>;
	/** Geothermal spots by purity (geysers have no resource). */
	geysers: PurityCounts;
	/** Resource wells, keyed by resource class name. */
	frackingCores: Record<string, FrackingCoreCounts>;
}
