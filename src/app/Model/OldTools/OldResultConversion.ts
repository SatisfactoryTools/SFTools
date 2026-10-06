import {Node} from '@src/Model/Planner/Solver/Response/Node';

export interface OldResultConversion
{
	readonly nodes: Node[];
	readonly unknownClassNames: string[];
}
