import {Injectable} from '@angular/core';
import {GraphEdge} from '@src/Model/Planner/Graph/GraphEdge';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';

@Injectable({providedIn: 'root'})
export class GraphEdgeBuilder
{

	/**
	 * Derives item-flow edges from the nodes' IO. When prior edges are given
	 * (recomposing an existing graph), their source→target pairings are
	 * satisfied first so unchanged parts of the graph keep their connections
	 * (and thus their carried-over routing); only the remaining flow is
	 * matched greedily, largest outputs to largest inputs per item. Resets
	 * each node's IO bookkeeping first, so it is safe to call on nodes whose
	 * edges were already built once.
	 */
	public build(nodes: Node[], priorEdges: GraphEdge[] = []): GraphEdge[]
	{
		nodes.forEach(node => {
			node.inputs.forEach(io => io.reset());
			node.outputs.forEach(io => io.reset());
		});

		interface IndexedIO {
			nodeId: string;
			io: NodeIO;
		}

		const outputsByItem = new Map<string, IndexedIO[]>();
		const inputsByItem = new Map<string, IndexedIO[]>();

		nodes.forEach(node => {
			node.outputs.forEach(io => {
				const key = io.item.className;
				if (!outputsByItem.has(key)) outputsByItem.set(key, []);
				outputsByItem.get(key)!.push({nodeId: node.id, io});
			});
			node.inputs.forEach(io => {
				const key = io.item.className;
				if (!inputsByItem.has(key)) inputsByItem.set(key, []);
				inputsByItem.get(key)!.push({nodeId: node.id, io});
			});
		});

		const edges: GraphEdge[] = [];

		// Stable phase: re-establish prior pairings up to the current flow.
		priorEdges.forEach(prior => {
			const outputs = (outputsByItem.get(prior.itemClassName) ?? []).filter(o => o.nodeId === prior.sourceId);
			const inputs = (inputsByItem.get(prior.itemClassName) ?? []).filter(i => i.nodeId === prior.targetId);
			let amount = 0;
			outputs.forEach(out => {
				inputs.forEach(inp => {
					const take = Math.min(out.io.remaining, inp.io.remaining);
					out.io.remaining -= take;
					inp.io.remaining -= take;
					amount += take;
				});
			});
			if (amount > 1e-6) {
				edges.push({sourceId: prior.sourceId, targetId: prior.targetId, itemClassName: prior.itemClassName, amount});
			}
		});

		// Greedy phase: match whatever flow the stable phase left over.
		for (const [itemClassName, outputs] of outputsByItem) {
			const inputs = inputsByItem.get(itemClassName);
			if (!inputs) continue;

			outputs.sort((a, b) => b.io.remaining - a.io.remaining);
			inputs.sort((a, b) => b.io.remaining - a.io.remaining);

			let i = 0;
			let j = 0;
			while (i < outputs.length && j < inputs.length) {
				const out = outputs[i];
				const inp = inputs[j];
				if (out.io.isDepleted()) {
					i++;
					continue;
				}
				if (inp.io.isDepleted()) {
					j++;
					continue;
				}
				const amount = Math.min(out.io.remaining, inp.io.remaining);

				edges.push({
					sourceId: out.nodeId,
					targetId: inp.nodeId,
					itemClassName,
					amount,
				});

				out.io.remaining -= amount;
				inp.io.remaining -= amount;

				if (out.io.isDepleted()) i++;
				if (inp.io.isDepleted()) j++;
			}
		}

		return edges;
	}

}
