import {GraphWarningKind} from '@src/Model/Planner/Graph/GraphWarningKind';

export interface GraphWarningDetail
{

	readonly kind: GraphWarningKind;

	readonly iconHash: string | null;

	readonly title: string;

	readonly text: string;

}
