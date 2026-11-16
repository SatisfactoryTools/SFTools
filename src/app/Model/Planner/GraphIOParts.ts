import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';

export interface GraphIOParts
{

	readonly inputs: NodeIO[];

	/** What the plan was asked to make (its product nodes). */
	readonly products: NodeIO[];

	readonly byproducts: NodeIO[];

}
