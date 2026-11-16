import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';

/** A subplan node in the parent's calculation: one column whose unit is the node as it is (fixed, follows) or one copy. */
export interface SubplanBlock
{

	readonly nodeId: string;

	readonly variable: string;

	/** Fixed blocks are built exactly once; the others are sized by the calculation. */
	readonly fixed: boolean;

	/** Whole copies only. */
	readonly integer: boolean;

	readonly inputs: NodeIO[];
	readonly outputs: NodeIO[];

	/** Average MW drawn minus generated, per unit. */
	readonly netPower: number;

	/** Raw resources mined per unit, for pricing. */
	readonly mines: Map<string, number>;

	/** The part of `mines` that counts against the parent's resource limits. */
	readonly sharedMines: Map<string, number>;

	/** Somersloops per unit that count against the parent's budget. */
	readonly sharedSloops: number;

	readonly machines: number;

}
