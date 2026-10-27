export interface FactorySiteRow
{
	readonly className: string;
	readonly name: string;
	readonly demand: number;
	readonly nodeCount: number;
	/** What every usable node together gives; below the demand, the heatmap uses them all. */
	readonly capacity: number;
	readonly fluid: boolean;
}
