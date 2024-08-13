import {MaterialSchema} from '@src/Model/API/Schema/Data/MaterialSchema';
import {Event} from '@src/Model/API/Schema/Data/Parts/Event';
import {Item} from '@src/Model/Data/Entities/Item';
import {ItemAmount} from '@src/Model/Data/Entities/Parts/ItemAmount';

export class Material
{

	public readonly className: string;
	public readonly ingredients: ItemAmount[];
	public readonly events: Event[];

	public constructor(schema: MaterialSchema, itemMap: Map<string, Item>)
	{
		this.className = schema.className;
		this.ingredients = schema.ingredients.map(ia => ({ item: itemMap.get(ia.item)!, amount: ia.amount }));
		this.events = schema.events;
	}

}
