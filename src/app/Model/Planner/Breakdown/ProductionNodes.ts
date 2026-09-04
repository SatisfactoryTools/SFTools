import {GeneratorNode} from '@src/Model/Planner/Solver/Response/GeneratorNode';
import {MineNode} from '@src/Model/Planner/Solver/Response/MineNode';
import {RecipeNode} from '@src/Model/Planner/Solver/Response/RecipeNode';

/** The nodes of a plan that build or extract something, gathered recursively across its subplans. */
export interface ProductionNodes
{

	readonly recipes: RecipeNode[];

	readonly generators: GeneratorNode[];

	readonly mines: MineNode[];

}
