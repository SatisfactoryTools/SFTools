export interface FactorySiteWorkerResponse
{
	readonly id: number;
	/** Row by row; NaN outside the mask. */
	readonly scores: Float32Array;
}
