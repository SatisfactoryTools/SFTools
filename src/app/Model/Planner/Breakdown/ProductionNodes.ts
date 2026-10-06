import {CountedNode} from '@src/Model/Planner/Breakdown/CountedNode';
import {CountedExtraPower} from '@src/Model/Planner/Breakdown/CountedExtraPower';
import {GeneratorNode} from '@src/Model/Planner/Solver/Response/GeneratorNode';
import {MineNode} from '@src/Model/Planner/Solver/Response/MineNode';
import {RecipeNode} from '@src/Model/Planner/Solver/Response/RecipeNode';

export interface ProductionNodes
{

	readonly recipes: CountedNode<RecipeNode>[];

	readonly generators: CountedNode<GeneratorNode>[];

	readonly mines: CountedNode<MineNode>[];

	readonly extraPower: CountedExtraPower[];

}
