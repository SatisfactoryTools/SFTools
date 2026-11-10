import {Injectable} from '@angular/core';
import {Graph} from '@src/Model/Planner/Graph/Graph';
import {GraphEdge} from '@src/Model/Planner/Graph/GraphEdge';
import {MachineGroupNormalizer} from '@src/Model/Planner/MachineGroupNormalizer';
import {NodeResizer} from '@src/Model/Planner/NodeResizer';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';
import {ProductionNodeScaler} from '@src/Model/Planner/ProductionNodeScaler';
import {GeneratorNode} from '@src/Model/Planner/Solver/Response/GeneratorNode';
import {ItemAmountNode} from '@src/Model/Planner/Solver/Response/ItemAmountNode';
import {MachineGroup} from '@src/Model/Planner/Solver/Response/MachineGroup';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {RecipeNode} from '@src/Model/Planner/Solver/Response/RecipeNode';

/** The reverse of NodeSplitter: splitting a node and merging the copies back gives the original machines. */
@Injectable({providedIn: 'root'})
export class NodeMerger
{

	public constructor(
		private readonly scaler: ProductionNodeScaler,
		private readonly resizer: NodeResizer,
		private readonly normalizer: MachineGroupNormalizer,
	)
	{
	}

	/** Why these nodes cannot be merged, or null when they can. */
	public blocker(nodes: Node[]): string | null
	{
		if (nodes.length < 2) {
			return 'Select at least two nodes.';
		}
		const keys = nodes.map(node => this.keyOf(node));
		if (keys.some(key => key === null)) {
			return 'Only recipe, generator and item nodes can be merged.';
		}
		if (nodes.some(node => node.type !== nodes[0].type)) {
			return 'Only nodes of the same kind can be merged.';
		}
		if (keys.some(key => key !== keys[0])) {
			return this.mismatchHint(nodes[0]);
		}
		return null;
	}

	public merge(graph: Graph, nodeIds: string[], settings: PlanSettings | null): Graph | null
	{
		const ids = new Set(nodeIds);
		// Graph order, so merging split copies back keeps the id the first copy kept from the original.
		const nodes = graph.nodes.filter(node => ids.has(node.id));
		if (this.blocker(nodes) !== null) {
			return null;
		}

		const merged = this.mergedNode(nodes, settings);
		if (!merged) {
			return null;
		}
		merged.x = nodes.reduce((sum, node) => sum + node.x, 0) / nodes.length;
		merged.y = nodes.reduce((sum, node) => sum + node.y, 0) / nodes.length;
		merged.locked = true;
		merged.done = nodes.every(node => node.done);

		let replaced = false;
		const mergedNodes = graph.nodes.flatMap(node => {
			if (!ids.has(node.id)) {
				return [node];
			}
			if (replaced) {
				return [];
			}
			replaced = true;
			return [merged];
		});

		return {nodes: mergedNodes, edges: this.mergedEdges(graph.edges, ids, merged.id)};
	}

	private mergedNode(nodes: Node[], settings: PlanSettings | null): Node | null
	{
		const first = nodes[0];
		if (first instanceof RecipeNode) {
			return this.mergedRecipe(nodes as RecipeNode[], settings);
		}
		if (first instanceof GeneratorNode || first instanceof ItemAmountNode) {
			return this.resizer.withSize(first, this.sum(nodes.map(node => node.amount)), first.id);
		}
		return null;
	}

	private mergedRecipe(nodes: RecipeNode[], settings: PlanSettings | null): RecipeNode
	{
		const first = nodes[0];
		const target = this.sum(nodes.map(node => node.target));
		const combined = this.combinedGroups(nodes.flatMap(node => node.groups));

		// Machines the plan generated are generated again for the total; hand-made groups are kept as they are.
		let groups = combined;
		if (nodes.every(node => this.isGenerated(node, settings))) {
			const sample = new RecipeNode(first.id, target, combined, first.machine, first.recipe);
			groups = this.normalizer.recalculated(combined, target, first.groupingMode, this.scaler.buildClockOf(sample, settings));
		}

		const merged = new RecipeNode(first.id, target, groups, first.machine, first.recipe);
		merged.groupingMode = first.groupingMode;
		return merged;
	}

	private isGenerated(node: RecipeNode, settings: PlanSettings | null): boolean
	{
		const regenerated = this.normalizer.recalculated(node.groups, node.target, node.groupingMode, this.scaler.buildClockOf(node, settings));
		return this.sameGroups(this.combinedGroups(node.groups), this.combinedGroups(regenerated));
	}

	/** Groups running at the same clock with the same somersloops become one. */
	private combinedGroups(groups: MachineGroup[]): MachineGroup[]
	{
		const combined: MachineGroup[] = [];
		groups.forEach(group => {
			const index = combined.findIndex(entry => entry.clockSpeed === group.clockSpeed && entry.sloops === group.sloops);
			if (index === -1) {
				combined.push({...group});
			} else {
				combined[index] = {...combined[index], machines: combined[index].machines + group.machines};
			}
		});
		return combined;
	}

	private sameGroups(a: MachineGroup[], b: MachineGroup[]): boolean
	{
		return a.length === b.length && a.every(group => b.some(other => other.machines === group.machines
			&& other.clockSpeed === group.clockSpeed
			&& other.sloops === group.sloops));
	}

	/** Connections between the merged nodes become the merged node feeding itself, so every flow stays balanced. */
	private mergedEdges(edges: GraphEdge[], ids: Set<string>, mergedId: string): GraphEdge[]
	{
		const byKey = new Map<string, GraphEdge>();
		edges.forEach(edge => {
			const sourceId = ids.has(edge.sourceId) ? mergedId : edge.sourceId;
			const targetId = ids.has(edge.targetId) ? mergedId : edge.targetId;
			const key = `${sourceId}|${targetId}|${edge.itemClassName}`;
			const existing = byKey.get(key);
			if (existing) {
				existing.amount += edge.amount;
				existing.done = existing.done && edge.done;
			} else if (sourceId === edge.sourceId && targetId === edge.targetId) {
				byKey.set(key, {...edge});
			} else {
				// The old route ends at a node that is gone.
				byKey.set(key, {sourceId, targetId, itemClassName: edge.itemClassName, amount: edge.amount, done: edge.done});
			}
		});
		return [...byKey.values()];
	}

	private keyOf(node: Node): string | null
	{
		if (node instanceof RecipeNode) {
			return `${node.recipe.className}|${node.machine.className}`;
		}
		if (node instanceof GeneratorNode) {
			return `${node.generator.className}|${node.fuel.item.className}|${node.clockSpeed}`;
		}
		if (node instanceof ItemAmountNode) {
			return node.item.className;
		}
		return null;
	}

	private mismatchHint(node: Node): string
	{
		if (node instanceof RecipeNode) {
			return 'Only nodes with the same recipe and machine can be merged.';
		}
		if (node instanceof GeneratorNode) {
			return 'Only generators with the same fuel and clock speed can be merged.';
		}
		return 'Only nodes with the same item can be merged.';
	}

	private sum(values: number[]): number
	{
		return values.reduce((total, value) => total + value, 0);
	}

}
