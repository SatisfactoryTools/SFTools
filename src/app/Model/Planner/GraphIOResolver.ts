import {Injectable} from '@angular/core';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {Graph} from '@src/Model/Planner/Graph/Graph';
import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';

@Injectable({providedIn: 'root'})
export class GraphIOResolver
{

	public constructor(
		private readonly versionManager: VersionManager,
	)
	{
	}

	public resolve(graph: Graph | null): {inputs: NodeIO[]; outputs: NodeIO[]}
	{
		const inputs = new Map<string, number>();
		const outputs = new Map<string, number>();

		(graph?.nodes ?? []).forEach(node => {
			// Raw JSON nodes carry itemClassName, hydrated ones an item entity.
			const raw = node as unknown as {type?: string; amount?: number; itemClassName?: string; item?: {className: string}};
			const itemClassName = raw.item?.className ?? raw.itemClassName;
			const amount = raw.amount ?? 0;
			if (!itemClassName || amount <= 0) {
				return;
			}
			if (raw.type === 'input') {
				inputs.set(itemClassName, (inputs.get(itemClassName) ?? 0) + amount);
			} else if (raw.type === 'product' || raw.type === 'byproduct') {
				outputs.set(itemClassName, (outputs.get(itemClassName) ?? 0) + amount);
			}
		});

		return {inputs: this.toNodeIO(inputs), outputs: this.toNodeIO(outputs)};
	}

	private toNodeIO(amounts: Map<string, number>): NodeIO[]
	{
		const data = this.versionManager.activeVersionData();
		if (!data) {
			return [];
		}
		return [...amounts.entries()]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([className, amount]) => new NodeIO(data.getItemByClassName(className), amount));
	}

}
