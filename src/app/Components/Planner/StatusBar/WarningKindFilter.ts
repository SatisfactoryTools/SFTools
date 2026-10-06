import {GraphWarningKind} from '@src/Model/Planner/Graph/GraphWarningKind';

export interface WarningKindFilter
{

	readonly kind: GraphWarningKind;

	readonly label: string;

	readonly count: number;

}
