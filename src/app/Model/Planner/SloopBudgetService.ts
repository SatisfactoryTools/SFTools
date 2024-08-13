import {Injectable} from '@angular/core';
import {Graph} from '@src/Model/Planner/Graph/Graph';

/** Shape of a recipe node's machine group as needed for sloop accounting. */
interface SloopGroup
{
	readonly machines: number;
	readonly sloops: number;
}

/** The recipe-node fields we read structurally - works for both hydrated and raw JSON nodes. */
interface RecipeLikeNode
{
	readonly type?: string;
	readonly locked?: boolean;
	readonly groups?: readonly SloopGroup[];
}

/**
 * Somersloop budget accounting. Locked recipe nodes already have somersloops
 * committed to them, so the solver's placement budget is the plan's declared
 * budget minus what those locked nodes use.
 */
@Injectable({providedIn: 'root'})
export class SloopBudgetService
{

	/** Somersloops committed to the locked recipe nodes of a graph. */
	public usedByLockedNodes(graph: Graph | null | undefined): number
	{
		let total = 0;
		for (const node of graph?.nodes ?? []) {
			const recipe = node as RecipeLikeNode;
			if (recipe.type === 'recipe' && recipe.locked === true && recipe.groups) {
				for (const group of recipe.groups) {
					total += (group.machines ?? 0) * (group.sloops ?? 0);
				}
			}
		}
		return total;
	}

	/** Somersloops left for the solver to place: the budget minus what locked nodes use (never below 0). */
	public remaining(maxSloops: number, graph: Graph | null | undefined): number
	{
		return Math.max(0, maxSloops - this.usedByLockedNodes(graph));
	}

}
