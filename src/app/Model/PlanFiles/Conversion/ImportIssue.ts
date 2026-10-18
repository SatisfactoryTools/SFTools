import {ImportIssueLevel} from '@src/Model/PlanFiles/Conversion/ImportIssueLevel';

export interface ImportIssue
{
	readonly level: ImportIssueLevel;
	readonly text: string;
	readonly count: number;
}
