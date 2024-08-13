export interface FuelSchema
{

	item: string;
	supplementalItem: string | null;
	byproduct: string | null;
	byproductAmount: number;
	acceptsAnySolidFuel: boolean;

}
