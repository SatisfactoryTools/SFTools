import {Node} from '@src/Model/Planner/Solver/Response/Node';

export interface CountedNode<T extends Node>
{

	readonly node: T;

	readonly count: number;

}
