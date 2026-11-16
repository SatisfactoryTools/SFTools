export interface SharedPlanNode
{
	id: string;
	name: string;
	data: string;
	createdAt: string;
	subplans: SharedPlanNode[];
}
