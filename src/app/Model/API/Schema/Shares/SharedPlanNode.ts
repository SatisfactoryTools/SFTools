/** A frozen plan (or subplan) in a share payload; `data` is a JSON string. */
export interface SharedPlanNode
{
	/** The sharer's original UUID - generate fresh ids when copying. */
	id: string;
	name: string;
	description: string | null;
	data: string;
	createdAt: string;
	subplans: SharedPlanNode[];
}
