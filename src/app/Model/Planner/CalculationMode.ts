/**
 * How the calculator turns a solver result into the plan's graph:
 * - automatic: recalculates (debounced) whenever the request changes, replacing the graph
 * - manual-fresh: on demand, replaces the graph
 * - manual-upgrade: on demand, merges into the graph, summing matching nodes
 * - manual-append: on demand, adds beside the graph without merging
 */
export type CalculationMode = 'automatic' | 'manual-fresh' | 'manual-upgrade' | 'manual-append';
