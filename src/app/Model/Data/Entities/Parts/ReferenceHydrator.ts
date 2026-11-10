import {ItemAmountSchema} from '@src/Model/API/Schema/Data/Parts/ItemAmountSchema';
import {Item} from '@src/Model/Data/Entities/Item';
import {ItemAmount} from '@src/Model/Data/Entities/Parts/ItemAmount';

/**
 * Mod and custom-version data can reference class names the data does not contain, and build-gun recipes list buildings as products.
 * Unknown references are dropped so every hydrated reference points at a real entity.
 */
export class ReferenceHydrator
{

	public static amounts(schemas: ItemAmountSchema[], itemMap: Map<string, Item>): ItemAmount[]
	{
		return schemas
			.filter(schema => itemMap.has(schema.item))
			.map(schema => ({item: itemMap.get(schema.item)!, amount: schema.amount}));
	}

	public static entries<T>(classNames: string[], map: Map<string, T>): T[]
	{
		return classNames.map(className => map.get(className)).filter(entry => entry !== undefined);
	}

}
