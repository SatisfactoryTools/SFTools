import {CountedNode} from '@src/Model/Planner/Breakdown/CountedNode';
import {GeneratorNode} from '@src/Model/Planner/Solver/Response/GeneratorNode';
import {MineNode} from '@src/Model/Planner/Solver/Response/MineNode';
import {RecipeNode} from '@src/Model/Planner/Solver/Response/RecipeNode';

/**
 * The nodes of a plan that build or extract something, gathered recursively
 * across its subplans. Each node carries how many times it is built - one for
 * the plan's own nodes, more for nodes inside a subplan built several times.
 */
export interface ProductionNodes
{

	readonly recipes: CountedNode<RecipeNode>[];

	readonly generators: CountedNode<GeneratorNode>[];

	readonly mines: CountedNode<MineNode>[];

}
