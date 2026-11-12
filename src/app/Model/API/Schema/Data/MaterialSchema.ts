import {Event} from '@src/Model/API/Schema/Data/Parts/Event';
import {ItemAmountSchema} from '@src/Model/API/Schema/Data/Parts/ItemAmountSchema';

export interface MaterialSchema
{

	className: string;
	mod?: string;
	ingredients: ItemAmountSchema[];
	events: Event[];

}
