import {PowerEntryRow} from '@src/Model/Planner/Breakdown/PowerEntryRow';
import {PowerDraw} from '@src/Model/Planner/PowerDraw';

export interface PowerRow
{

	readonly key: string;

	readonly name: string;

	readonly icon: string | null;

	readonly kind: 'machine' | 'generator' | 'subplan' | 'plan';

	readonly machines: number;

	readonly power: PowerDraw;

	readonly entries: PowerEntryRow[];

}
