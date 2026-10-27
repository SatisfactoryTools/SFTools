export interface FactorySiteResource
{
	readonly className: string;
	readonly demand: number;
	/** Distance multiplier: above 1 for fluids when they cost more. */
	readonly factor: number;
	/** x, y, capacity per node, flattened so it crosses to the worker cheaply. */
	readonly nodes: number[];
}
