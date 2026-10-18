import {PlanExportSource} from '@src/Model/PlanFiles/PlanExportSource';

export interface PlanExportRequest
{
	readonly source: PlanExportSource;
	/** Pre-selected in the dialog; null selects everything. */
	readonly target: {readonly type: 'plan' | 'folder'; readonly id: string} | null;
}
