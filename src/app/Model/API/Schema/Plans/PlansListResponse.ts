import {FolderTreeSchema} from '@src/Model/API/Schema/Plans/FolderTreeSchema';
import {PlanSchema} from '@src/Model/API/Schema/Plans/PlanSchema';

export interface PlansListResponse
{
	readonly folders: FolderTreeSchema[];
	readonly plans: PlanSchema[];
}
