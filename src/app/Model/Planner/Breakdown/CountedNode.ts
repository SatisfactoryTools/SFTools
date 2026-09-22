import {Node} from '@src/Model/Planner/Solver/Response/Node';

/**
 * A node of a plan together with how many times the plan builds it. A
 * subplan built several times contributes everything inside it that many
 * times, without the nodes themselves being copied.
 */
export interface CountedNode<T extends Node>
{

	readonly node: T;

	readonly count: number;

}
