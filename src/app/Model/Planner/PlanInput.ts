export interface PlanInput
{
	itemClassName: string;
	amount: number;
	weight: number;
	/** No upper bound: the plan takes as much as it wants, still priced by the weight. `amount` is kept for switching it off again. */
	infinite?: boolean;
}
