import {GraphWarningKind} from '@src/Model/Planner/Graph/GraphWarningKind';

/** One warning on a node, split into parts the warnings list can lay out itself. */
export interface GraphWarningDetail
{

	readonly kind: GraphWarningKind;

	/** Icon of the item the warning is about; null when it is not about an item. */
	readonly iconHash: string | null;

	/** The item's name, or a short stand-in ("Machines") for warnings without an item. */
	readonly title: string;

	/** What is wrong, in words: "needs 60/min, receiving 30/min". */
	readonly text: string;

}
