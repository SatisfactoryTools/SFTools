/** One per-recipe clock-speed override for the solver (Overclocking tab row). */
export interface RecipeClockSpeed
{

	recipeClassName: string;

	/** Clock speed in percent (1–250). */
	clockSpeed: number;

}
