/**
 * A user-supplied item source the solver may draw from: up to `amount` per
 * minute, priced at `weight` per unit in the optimisation objective (a low
 * weight makes it a cheap alternative to mining or crafting).
 */
export interface PlanInput
{
	itemClassName: string;
	amount: number;
	weight: number;
}
