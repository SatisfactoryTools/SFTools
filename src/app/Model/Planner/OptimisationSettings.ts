/**
 * What the solver minimises, with relative weights (e.g. how much 1 MW costs
 * compared to 1 machine). Absent flags default to raw resources, power and
 * input weights on, machines off; absent weights resolve via
 * OptimisationDefaults. At least one goal must stay enabled or the solver
 * refuses to run.
 */
export interface OptimisationSettings
{

	readonly rawResources?: boolean;
	readonly power?: boolean;
	readonly machines?: boolean;
	/** Price user inputs by their weight (Input tab); off makes every input free. Absent = on. */
	readonly inputs?: boolean;
	/** @deprecated Moved to PlanSettings.resourceWeights; only read by PlanSettingsNormalizer. */
	readonly resourceWeights?: Record<string, number>;
	readonly powerWeight?: number;
	readonly machinesWeight?: number;

}
