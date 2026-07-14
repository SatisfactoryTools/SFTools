import {Injectable} from '@angular/core';
import {Data} from '@src/Model/Data/Data';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {GroupingMode} from '@src/Model/Planner/GroupingMode';
import {MachineGroupNormalizer} from '@src/Model/Planner/MachineGroupNormalizer';
import {MachineGroup} from '@src/Model/Planner/Solver/Response/MachineGroup';
import {Graph} from '@src/Model/Planner/Graph/Graph';
import {GraphEdge} from '@src/Model/Planner/Graph/GraphEdge';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanInput} from '@src/Model/Planner/PlanInput';
import {PlanMetadata} from '@src/Model/Planner/PlanMetadata';
import {ByproductNode} from '@src/Model/Planner/Solver/Response/ByproductNode';
import {GeneratorNode} from '@src/Model/Planner/Solver/Response/GeneratorNode';
import {InputNode} from '@src/Model/Planner/Solver/Response/InputNode';
import {MineNode} from '@src/Model/Planner/Solver/Response/MineNode';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {NodeIO} from '@src/Model/Planner/Solver/Response/NodeIO';
import {ProductNode} from '@src/Model/Planner/Solver/Response/ProductNode';
import {RecipeNode} from '@src/Model/Planner/Solver/Response/RecipeNode';
import {SinkNode} from '@src/Model/Planner/Solver/Response/SinkNode';
import {SubplanNode} from '@src/Model/Planner/Solver/Response/SubplanNode';

@Injectable({providedIn: 'root'})
export class PlanSerializer
{

	public constructor(
		private readonly versionManager: VersionManager,
		private readonly normalizer: MachineGroupNormalizer,
	)
	{
	}

	public serialize(plan: Plan): string
	{
		return JSON.stringify(plan);
	}

	public deserialize(json: string): Plan
	{
		const data = this.versionManager.activeVersionData();
		if (!data) {
			throw new Error('No active version data');
		}
		const raw = JSON.parse(json) as Record<string, unknown>;
		return {
			...(raw as Omit<Plan, 'graph' | 'folderId' | 'parentPlanId' | 'revision' | 'metadata'>),
			folderId: null,
			parentPlanId: null,
			revision: null,
			// Fallback covers plans exported before metadata existed.
			metadata: {graphDirty: (raw['metadata'] as PlanMetadata | undefined)?.graphDirty ?? false},
			// Preserve all three states (undefined "unset" / null "none" / string).
			iconClassName: raw['iconClassName'] as string | null | undefined,
			// Fallback covers plans saved before user inputs existed.
			inputs: (raw['inputs'] as PlanInput[] | undefined) ?? [],
			graph: raw['graph'] ? this.deserializeGraph(raw['graph'] as Record<string, unknown>, data) : null,
		};
	}

	/**
	 * Rebuilds node class instances for a graph parsed straight from JSON
	 * (localStorage / API); returns the same graph if already hydrated.
	 */
	public reviveGraph(graph: Graph): Graph
	{
		if (graph.nodes.every(node => node instanceof Node)) {
			return graph;
		}
		const data = this.versionManager.activeVersionData();
		if (!data) {
			throw new Error('No active version data');
		}
		return this.deserializeGraph(graph as unknown as Record<string, unknown>, data);
	}

	private deserializeGraph(raw: Record<string, unknown>, data: Data): Graph
	{
		const rawNodes = raw['nodes'] as Record<string, unknown>[];
		const rawEdges = raw['edges'] as GraphEdge[];
		return {
			nodes: rawNodes.map(n => this.deserializeNode(n, data)),
			edges: rawEdges,
		};
	}

	private deserializeNode(raw: Record<string, unknown>, data: Data): Node
	{
		const id = raw['id'] as string;
		const amount = raw['amount'] as number;
		const x = raw['x'] as number;
		const y = raw['y'] as number;

		let node: Node;

		switch (raw['type']) {
			case 'recipe': {
				// Three save formats: {target, groups} (current), {groups}
				// (groups predate targets - target falls back to capacity),
				// and {amount, clockSpeed, sloops} (pre-groups - the fractional
				// amount at that clock IS the exact target).
				const groups = (raw['groups'] as MachineGroup[] | undefined)
					?? this.normalizer.fromFractionalAmount(
						amount,
						raw['clockSpeed'] as number,
						raw['sloops'] as number,
					);
				const target = (raw['target'] as number | undefined)
					?? (raw['groups']
						? groups.reduce((sum, g) => sum + g.machines * (g.clockSpeed / 100), 0)
						: amount * (raw['clockSpeed'] as number) / 100);
				const recipeNode = new RecipeNode(
					id,
					target,
					groups,
					data.getBuildingByClassName(raw['machineClassName'] as string),
					data.getRecipeByClassName(raw['recipeClassName'] as string),
				);
				// Fallback covers nodes saved before grouping modes existed.
				recipeNode.groupingMode = (raw['groupingMode'] as GroupingMode | undefined) ?? 'underclock-last';
				node = recipeNode;
				break;
			}
			case 'mine':
				node = new MineNode(id, amount, data.getItemByClassName(raw['itemClassName'] as string));
				break;
			case 'input':
				node = new InputNode(id, amount, data.getItemByClassName(raw['itemClassName'] as string));
				break;
			case 'product':
				node = new ProductNode(id, amount, data.getItemByClassName(raw['itemClassName'] as string));
				break;
			case 'byproduct':
				node = new ByproductNode(id, amount, data.getItemByClassName(raw['itemClassName'] as string));
				break;
			case 'generator': {
				const generator = data.getBuildingByClassName(raw['generatorClassName'] as string);
				const fuel = generator.fuel.find(f => f.item.className === raw['fuelItemClassName']);
				if (!fuel) {
					throw new Error(`Generator ${generator.className} has no fuel ${raw['fuelItemClassName']}`);
				}
				node = new GeneratorNode(id, amount, generator, fuel);
				break;
			}
			case 'subplan':
				node = new SubplanNode(
					id,
					raw['subplanId'] as string,
					raw['name'] as string,
					this.deserializeNodeIO(raw['inputs'], data),
					this.deserializeNodeIO(raw['outputs'], data),
				);
				break;
			case 'sink': {
				// Current format is one item per sink node; the pre-rework
				// aggregate stored an `items` array - take its first entry.
				const sinkItem = (raw['itemClassName'] as string | undefined)
					?? (raw['items'] as {itemClassName: string}[] | undefined)?.[0]?.itemClassName;
				const sinkAmount = (raw['amount'] as number | undefined)
					?? (raw['items'] as {amount: number}[] | undefined)?.[0]?.amount ?? 0;
				node = new SinkNode(id, sinkAmount, data.getItemByClassName(sinkItem as string));
				break;
			}
			default:
				throw new Error(`Unknown node type: ${raw['type']}`);
		}

		node.x = x;
		node.y = y;
		// Subplan nodes are user-owned by definition and stay locked forever.
		node.locked = raw['locked'] === true || node instanceof SubplanNode;
		return node;
	}

	private deserializeNodeIO(raw: unknown, data: Data): NodeIO[]
	{
		return ((raw as {itemClassName: string; amount: number}[] | undefined) ?? [])
			.map(io => new NodeIO(data.getItemByClassName(io.itemClassName), io.amount));
	}

}
