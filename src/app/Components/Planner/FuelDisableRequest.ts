/** One generator+fuel combination to remove from the enabled-fuels selection. */
export interface FuelDisableRequest
{
	generatorClassName: string;
	fuelItemClassName: string;
}
