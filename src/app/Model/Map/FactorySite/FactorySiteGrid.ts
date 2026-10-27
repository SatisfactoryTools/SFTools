/** Cell centres sit at min + (index + 0.5) * cellSize, in world units. */
export interface FactorySiteGrid
{
	readonly minX: number;
	readonly minY: number;
	readonly cellSize: number;
	readonly columns: number;
	readonly rows: number;
}
