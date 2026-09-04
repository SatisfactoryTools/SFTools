export interface PlanMetadata
{

	/** True once the user manually modified the graph; pauses automatic recalculation. */
	readonly graphDirty: boolean;

	/**
	 * Achieved rates of the last maximise solve, keyed by item class name (or
	 * the power/sink-points special class). Shown in the Production tab;
	 * absent when the plan was never solved with maximise requests.
	 */
	readonly achievedMaximums?: Record<string, number>;

	/**
	 * The plan's solver inputs changed behind its back - a folder pushed new
	 * fixed settings, or another plan's mining changed its pooled share - and
	 * the stored graph no longer reflects them. Cleared by a successful solve.
	 */
	readonly recalculationNeeded?: boolean;

}
