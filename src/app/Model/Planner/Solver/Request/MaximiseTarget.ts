import {Item} from '@src/Model/Data/Entities/Item';
import {MaximiseCategory} from '@src/Model/Planner/Solver/Request/MaximiseCategory';

/**
 * What the solver should maximise. For 'items' every listed item is pushed to
 * the same rate (the LP's single MaxRate variable); for 'power' and
 * 'sinkPoints' the items list is empty and MaxRate joins the respective
 * balance row instead.
 */
export interface MaximiseTarget
{

	category: MaximiseCategory;
	items: Item[];

}
