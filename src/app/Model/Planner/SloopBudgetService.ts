import {Injectable} from '@angular/core';
import {Graph} from '@src/Model/Planner/Graph/Graph';

interface SloopGroup
{
	readonly machines: number;
	readonly sloops: number;
}

/** Read structurally so raw JSON nodes work as well as hydrated ones. */
interface RecipeLikeNode
{
	readonly type?: string;
	readonly locked?: boolean;
	readonly groups?: readonly SloopGroup[];
}

@Injectable({providedIn: 'root'})
export class SloopBudgetService
{

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

	public remaining(maxSloops: number, graph: Graph | null | undefined): number
	{
		return Math.max(0, maxSloops - this.usedByLockedNodes(graph));
	}

}
