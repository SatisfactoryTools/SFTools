import {Item} from '@src/Model/Data/Entities/Item';

/** One construction material with its total amount (absolute count, not a rate). */
export interface BuildCostMaterialRow
{

	readonly item: Item;

	readonly amount: number;

}
