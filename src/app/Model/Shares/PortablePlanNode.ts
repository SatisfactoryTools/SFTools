export interface PortablePlanNode
{
	id: string;
	name: string;
	data: string;
	subplans: PortablePlanNode[];
}
