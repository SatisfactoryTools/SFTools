import {MaterialSchema} from '@src/Model/API/Schema/Data/MaterialSchema';
import {Event} from '@src/Model/API/Schema/Data/Parts/Event';
import {Item} from '@src/Model/Data/Entities/Item';
import {ItemAmount} from '@src/Model/Data/Entities/Parts/ItemAmount';
import {ReferenceHydrator} from '@src/Model/Data/Entities/Parts/ReferenceHydrator';

export class Material
{

	public readonly className: string;
	public readonly mod: string | null;
	public readonly ingredients: ItemAmount[];
	public readonly events: Event[];

	public constructor(schema: MaterialSchema, itemMap: Map<string, Item>)
	{
		this.className = schema.className;
		this.mod = schema.mod ?? null;
		this.ingredients = ReferenceHydrator.amounts(schema.ingredients, itemMap);
		this.events = schema.events;
	}

}
