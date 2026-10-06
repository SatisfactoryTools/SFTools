import {Item} from '@src/Model/Data/Entities/Item';
import {MaximiseCategory} from '@src/Model/Planner/Solver/Request/MaximiseCategory';

export interface MaximiseTarget
{

	category: MaximiseCategory;
	items: Item[];

}
