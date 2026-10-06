export interface SharedPlanNode
{
	id: string;
	name: string;
	description: string | null;
	data: string;
	createdAt: string;
	subplans: SharedPlanNode[];
}
