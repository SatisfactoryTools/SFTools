import {PlanFileRoot} from '@src/Model/PlanFiles/PlanFileRoot';
import {PlanFileVersion} from '@src/Model/PlanFiles/PlanFileVersion';

export interface PlanFile
{
	type: 'sftools-plans';
	exportedAt: string;
	version: PlanFileVersion;
	roots: PlanFileRoot[];
}
