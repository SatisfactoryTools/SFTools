import {SchematicSchema} from '@src/Model/API/Schema/Data/SchematicSchema';
import {Event} from '@src/Model/API/Schema/Data/Parts/Event';
import {SchematicType} from '@src/Model/API/Schema/Data/Parts/SchematicType';
import {DependencyData} from '@src/Model/Data/Entities/DependencyData';
import {Item} from '@src/Model/Data/Entities/Item';
import {Recipe} from '@src/Model/Data/Entities/Recipe';
import {UnlockData} from '@src/Model/Data/Entities/UnlockData';
import {ItemAmount} from '@src/Model/Data/Entities/Parts/ItemAmount';

export class Schematic
{

	public readonly className: string;
	public readonly icon: string | null;
	public readonly name: string;
	public readonly description: string;
	public readonly tier: number;
	public readonly cost: ItemAmount[];
	public readonly type: SchematicType;
	public readonly time: number;
	public readonly unlock: UnlockData;
	public readonly dependency: DependencyData;
	public readonly dependenciesBlockAccess: boolean;
	public readonly dependenciesHide: boolean;
	public readonly events: Event[];

	public constructor(
		schema: SchematicSchema,
		itemMap: Map<string, Item>,
		recipeMap: Map<string, Recipe>,
		schematicMap: Map<string, Schematic>,
	)
	{
		this.className = schema.className;
		this.icon = schema.icon;
		this.name = schema.name;
		this.description = schema.description;
		this.tier = schema.tier;
		this.cost = schema.cost.map(ia => ({ item: itemMap.get(ia.item)!, amount: ia.amount }));
		this.type = schema.type;
		this.time = schema.time;
		this.unlock = new UnlockData(schema.unlock, itemMap, recipeMap, schematicMap);
		this.dependency = new DependencyData(schema.dependency, schematicMap);
		this.dependenciesBlockAccess = schema.dependenciesBlockAccess;
		this.dependenciesHide = schema.dependenciesHide;
		this.events = schema.events;
	}

}
