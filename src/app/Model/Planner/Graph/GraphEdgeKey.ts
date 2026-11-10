import {GraphEdge} from '@src/Model/Planner/Graph/GraphEdge';

/** Edges have no id of their own; one item runs at most once between the same two nodes. */
export class GraphEdgeKey
{

	public static of(edge: Pick<GraphEdge, 'sourceId' | 'targetId' | 'itemClassName'>): string
	{
		return `${edge.sourceId}|${edge.targetId}|${edge.itemClassName}`;
	}

	public static same(a: Pick<GraphEdge, 'sourceId' | 'targetId' | 'itemClassName'>, b: Pick<GraphEdge, 'sourceId' | 'targetId' | 'itemClassName'>): boolean
	{
		return a.sourceId === b.sourceId && a.targetId === b.targetId && a.itemClassName === b.itemClassName;
	}

}
