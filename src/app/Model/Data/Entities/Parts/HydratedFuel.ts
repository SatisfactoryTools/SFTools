import {Item} from '@src/Model/Data/Entities/Item';

export interface HydratedFuel
{
	readonly item: Item;
	readonly supplementalItem: Item | null;
	readonly byproduct: Item | null;
	readonly byproductAmount: number;
	readonly acceptsAnySolidFuel: boolean;
}
