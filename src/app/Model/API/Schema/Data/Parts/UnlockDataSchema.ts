import {ItemAmountSchema} from '@src/Model/API/Schema/Data/Parts/ItemAmountSchema';
import {ScannableObjectSchema} from '@src/Model/API/Schema/Data/Parts/ScannableObjectSchema';

export interface UnlockDataSchema
{

	recipes: string[];
	schematics: string[];
	items: ItemAmountSchema[];
	scannableObjects: ScannableObjectSchema[];
	scannableResources: string[];
	tapes: string[];
	emotes: string[];
	inventorySlots: number;
	equipmentSlots: number;

}
