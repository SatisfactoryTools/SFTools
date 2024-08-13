/**
 * What the solver minimises, with relative weights (e.g. how much 1 MW costs
 * compared to 1 machine). Absent flags default to raw resources + power on,
 * machines off; absent weights resolve via OptimisationDefaults. At least
 * one goal must stay enabled or the solver refuses to run.
 */
export interface OptimisationSettings
{

	readonly rawResources?: boolean;
	readonly power?: boolean;
	readonly machines?: boolean;
	/** Per-resource weight overrides; resources not listed use the defaults. */
	readonly resourceWeights?: Record<string, number>;
	readonly powerWeight?: number;
	readonly machinesWeight?: number;

}
