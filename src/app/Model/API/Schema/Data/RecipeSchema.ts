import {Event} from '@src/Model/API/Schema/Data/Parts/Event';
import {ItemAmountSchema} from '@src/Model/API/Schema/Data/Parts/ItemAmountSchema';

export interface RecipeSchema
{

	className: string;
	name: string;
	ingredients: ItemAmountSchema[];
	products: ItemAmountSchema[];
	producedIn: string[];
	events: Event[];
	time: number;
	manualCraftingMultiplier: number;
	alternate: boolean;
	inBuildGun: boolean;
	inCraftBench: boolean;
	inEquipmentWorkshop: boolean;
	variablePowerDraw: boolean;
	variablePowerDrawConstant: number;
	variablePowerDrawFactor: number;

}
