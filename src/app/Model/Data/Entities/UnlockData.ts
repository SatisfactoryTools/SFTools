import {UnlockDataSchema} from '@src/Model/API/Schema/Data/Parts/UnlockDataSchema';
import {ScannableObjectSchema} from '@src/Model/API/Schema/Data/Parts/ScannableObjectSchema';
import {Item} from '@src/Model/Data/Entities/Item';
import {Recipe} from '@src/Model/Data/Entities/Recipe';
import {Schematic} from '@src/Model/Data/Entities/Schematic';
import {ItemAmount} from '@src/Model/Data/Entities/Parts/ItemAmount';

export class UnlockData
{

	public readonly recipes: Recipe[];
	public readonly items: ItemAmount[];
	public readonly scannableObjects: ScannableObjectSchema[];
	public readonly scannableResources: Item[];
	public readonly tapes: string[];
	public readonly emotes: string[];
	public readonly inventorySlots: number;
	public readonly equipmentSlots: number;

	private readonly rawSchematics: string[];
	private readonly schematicMap: Map<string, Schematic>;
	private cachedSchematics: Schematic[] | null = null;

	public get schematics(): Schematic[]
	{
		return this.cachedSchematics ??= this.rawSchematics.map(cn => this.schematicMap.get(cn)!);
	}

	public constructor(
		schema: UnlockDataSchema,
		itemMap: Map<string, Item>,
		recipeMap: Map<string, Recipe>,
		schematicMap: Map<string, Schematic>,
	)
	{
		this.recipes = schema.recipes.map(cn => recipeMap.get(cn)!);
		this.items = schema.items.map(ia => ({ item: itemMap.get(ia.item)!, amount: ia.amount }));
		this.scannableObjects = schema.scannableObjects;
		this.scannableResources = schema.scannableResources.map(cn => itemMap.get(cn)!);
		this.tapes = schema.tapes;
		this.emotes = schema.emotes;
		this.inventorySlots = schema.inventorySlots;
		this.equipmentSlots = schema.equipmentSlots;
		this.rawSchematics = schema.schematics;
		this.schematicMap = schematicMap;
	}

}
