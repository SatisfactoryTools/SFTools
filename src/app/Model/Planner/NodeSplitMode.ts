/**
 * Which of a node's connections a split follows: one copy per incoming
 * connection, one per outgoing connection, or the fewest copies that leave
 * every copy with a single source and a single target per item.
 */
export type NodeSplitMode = 'inputs' | 'outputs' | 'both';
