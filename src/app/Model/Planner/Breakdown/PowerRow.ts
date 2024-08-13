import {PowerEntryRow} from '@src/Model/Planner/Breakdown/PowerEntryRow';

/** Top-level power panel row: a building type, a generator type or a subplan. */
export interface PowerRow
{

	readonly key: string;

	readonly name: string;

	readonly kind: 'machine' | 'generator' | 'subplan' | 'plan';

	readonly machines: number;

	/** Signed MW: positive is consumption, negative is (net) production. */
	readonly megawatts: number;

	/** Expandable detail rows; subplan rows have none. */
	readonly entries: PowerEntryRow[];

}
