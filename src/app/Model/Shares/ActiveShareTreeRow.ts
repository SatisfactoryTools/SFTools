import {Plan} from '@src/Model/Planner/Plan';

/** One row of the open share's tree, as shown inside the Plans panel. */
export interface ActiveShareTreeRow
{
	readonly kind: 'folder' | 'plan';
	readonly depth: number;
	readonly name: string;
	/** The hydrated read-only plan behind a plan row; null for folders. */
	readonly plan: Plan | null;
}
