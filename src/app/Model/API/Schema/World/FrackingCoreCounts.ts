import {PurityCounts} from '@src/Model/API/Schema/World/PurityCounts';

/** One resource-well group: core count plus the extractable satellite nodes by purity. */
export interface FrackingCoreCounts
{
	cores: number;
	satellites: PurityCounts;
}
