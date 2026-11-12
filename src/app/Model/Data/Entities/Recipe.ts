import {RecipeSchema} from '@src/Model/API/Schema/Data/RecipeSchema';
import {Event} from '@src/Model/API/Schema/Data/Parts/Event';
import {Building} from '@src/Model/Data/Entities/Building';
import {Item} from '@src/Model/Data/Entities/Item';
import {ItemAmount} from '@src/Model/Data/Entities/Parts/ItemAmount';
import {ReferenceHydrator} from '@src/Model/Data/Entities/Parts/ReferenceHydrator';

export class Recipe
{

	public readonly className: string;
	public readonly mod: string | null;
	public readonly name: string;
	public readonly ingredients: ItemAmount[];
	public readonly products: ItemAmount[];
	public readonly producedIn: Building[];
	public readonly events: Event[];
	public readonly time: number;
	public readonly manualCraftingMultiplier: number;
	public readonly alternate: boolean;
	public readonly inBuildGun: boolean;
	public readonly inCraftBench: boolean;
	public readonly inEquipmentWorkshop: boolean;
	public readonly variablePowerDraw: boolean;
	public readonly variablePowerDrawConstant: number;
	public readonly variablePowerDrawFactor: number;

	public constructor(
		schema: RecipeSchema,
		itemMap: Map<string, Item>,
		buildingMap: Map<string, Building>,
	)
	{
		this.className = schema.className;
		this.mod = schema.mod ?? null;
		this.name = schema.name;
		this.ingredients = ReferenceHydrator.amounts(schema.ingredients, itemMap);
		this.products = ReferenceHydrator.amounts(schema.products, itemMap);
		this.producedIn = ReferenceHydrator.entries(schema.producedIn, buildingMap);
		this.events = schema.events;
		this.time = schema.time;
		this.manualCraftingMultiplier = schema.manualCraftingMultiplier;
		this.alternate = schema.alternate;
		this.inBuildGun = schema.inBuildGun;
		this.inCraftBench = schema.inCraftBench;
		this.inEquipmentWorkshop = schema.inEquipmentWorkshop;
		this.variablePowerDraw = schema.variablePowerDraw;
		this.variablePowerDrawConstant = schema.variablePowerDrawConstant;
		this.variablePowerDrawFactor = schema.variablePowerDrawFactor;
	}

}
