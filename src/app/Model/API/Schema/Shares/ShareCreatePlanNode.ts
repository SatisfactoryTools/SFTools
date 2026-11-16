export interface ShareCreatePlanNode
{
	id?: string;
	name: string;
	data: string;
	subplans: ShareCreatePlanNode[];
}
