import {Injectable} from '@angular/core';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {Graph} from '@src/Model/Planner/Graph/Graph';
import {GraphIOParts} from '@src/Model/Planner/GraphIOParts';
import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';

@Injectable({providedIn: 'root'})
export class GraphIOResolver
{

	public constructor(
		private readonly versionManager: VersionManager,
	)
	{
	}

	/** Outputs are products and byproducts together. */
	public resolve(graph: Graph | null): {inputs: NodeIO[]; outputs: NodeIO[]}
	{
		const amounts = this.amounts(graph);
		const outputs = new Map(amounts.products);
		amounts.byproducts.forEach((amount, className) => outputs.set(className, (outputs.get(className) ?? 0) + amount));
		return {inputs: this.toNodeIO(amounts.inputs), outputs: this.toNodeIO(outputs)};
	}

	public parts(graph: Graph | null): GraphIOParts
	{
		const amounts = this.amounts(graph);
		return {
			inputs: this.toNodeIO(amounts.inputs),
			products: this.toNodeIO(amounts.products),
			byproducts: this.toNodeIO(amounts.byproducts),
		};
	}

	private amounts(graph: Graph | null): {inputs: Map<string, number>; products: Map<string, number>; byproducts: Map<string, number>}
	{
		const inputs = new Map<string, number>();
		const products = new Map<string, number>();
		const byproducts = new Map<string, number>();

		(graph?.nodes ?? []).forEach(node => {
			// Raw JSON nodes carry itemClassName, hydrated ones an item entity.
			const raw = node as unknown as {type?: string; amount?: number; itemClassName?: string; item?: {className: string}};
			const itemClassName = raw.item?.className ?? raw.itemClassName;
			const amount = raw.amount ?? 0;
			if (!itemClassName || amount <= 0) {
				return;
			}
			const target = raw.type === 'input' ? inputs
				: raw.type === 'product' ? products
				: raw.type === 'byproduct' ? byproducts
				: null;
			target?.set(itemClassName, (target.get(itemClassName) ?? 0) + amount);
		});

		return {inputs, products, byproducts};
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
