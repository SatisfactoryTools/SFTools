export interface ShareCreatePlanNode
{
	id?: string;
	name: string;
	description?: string | null;
	data: string;
	subplans: ShareCreatePlanNode[];
}
