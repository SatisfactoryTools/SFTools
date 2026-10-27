import {PurityCounts} from '@src/Model/API/Schema/World/PurityCounts';

export interface ResourceAreaRow
{
	readonly className: string;
	readonly name: string;
	/** Nodes and well satellites together. */
	readonly counts: PurityCounts;
	/** Null: unlimited. */
	readonly limit: number | null;
}
