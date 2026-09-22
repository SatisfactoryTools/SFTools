import {GraphWarningKind} from '@src/Model/Planner/Graph/GraphWarningKind';

/** One kind chip above the warnings list: its wording and how many warnings it covers. */
export interface WarningKindFilter
{

	readonly kind: GraphWarningKind;

	readonly label: string;

	readonly count: number;

}
