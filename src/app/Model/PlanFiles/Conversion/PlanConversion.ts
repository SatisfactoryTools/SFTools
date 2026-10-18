import {Folder} from '@src/Model/Planner/Folder';
import {Plan} from '@src/Model/Planner/Plan';
import {ImportIssue} from '@src/Model/PlanFiles/Conversion/ImportIssue';

export interface PlanConversion
{
	readonly folders: Folder[];
	readonly plans: Plan[];
	/** By the (new) folder or plan id; entries without issues are absent. */
	readonly issues: ReadonlyMap<string, ImportIssue[]>;
}
