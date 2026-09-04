import {PowerEntryRow} from '@src/Model/Planner/Breakdown/PowerEntryRow';
import {PowerDraw} from '@src/Model/Planner/PowerDraw';

/** Top-level power panel row: a building type, a generator type or a subplan. */
export interface PowerRow
{

	readonly key: string;

	readonly name: string;

	/** Building icon hash for a machine or generator row; null for subplan/plan aggregate rows. */
	readonly icon: string | null;

	readonly kind: 'machine' | 'generator' | 'subplan' | 'plan';

	readonly machines: number;

	/** Signed draw: positive is consumption, negative is (net) production. */
	readonly power: PowerDraw;

	/** Expandable detail rows; subplan rows have none. */
	readonly entries: PowerEntryRow[];

}
