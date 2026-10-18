import {Plan} from '@src/Model/Planner/Plan';

export interface PlanExportRow
{
	readonly kind: 'folder' | 'plan';
	readonly id: string;
	readonly name: string;
	readonly depth: number;
	readonly plan: Plan | null;
	/** The row above it in the tree, so a search hit can bring its folders along. */
	readonly parentId: string | null;
}
