import {Item} from '@src/Model/Data/Entities/Item';

export interface Fuel
{
	readonly item: Item;
	readonly supplementalItem: Item | null;
	readonly byproduct: Item | null;
	readonly byproductAmount: number;
	readonly acceptsAnySolidFuel: boolean;
}
