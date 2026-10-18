export interface PortablePlanNode
{
	id: string;
	name: string;
	description: string | null;
	data: string;
	subplans: PortablePlanNode[];
}
