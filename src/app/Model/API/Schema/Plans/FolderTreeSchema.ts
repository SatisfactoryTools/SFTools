import {PlanSchema} from '@src/Model/API/Schema/Plans/PlanSchema';

export interface FolderTreeSchema
{
	readonly id: string;
	readonly name: string;
	readonly version: string;
	readonly createdAt: string;
	readonly data: string;
	readonly revision: number;
	readonly children: FolderTreeSchema[];
	readonly plans: PlanSchema[];
}
