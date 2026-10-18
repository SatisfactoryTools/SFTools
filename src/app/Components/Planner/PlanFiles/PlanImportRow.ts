import {ImportIssue} from '@src/Model/PlanFiles/Conversion/ImportIssue';

export interface PlanImportRow
{
	readonly kind: 'folder' | 'plan';
	readonly id: string;
	readonly name: string;
	readonly depth: number;
	readonly iconHash: string | null;
	readonly subplan: boolean;
	readonly issues: ImportIssue[];
	readonly hasWarnings: boolean;
	readonly warningCount: number;
	readonly infoCount: number;
}
