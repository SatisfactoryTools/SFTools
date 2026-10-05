/** Absent flags default to raw resources, power and inputs on, machines off; absent weights resolve via OptimisationDefaults. At least one goal must stay enabled or the solver refuses to run. */
export interface OptimisationSettings
{

	readonly rawResources?: boolean;
	readonly power?: boolean;
	readonly machines?: boolean;
	/** Off makes every user input free. */
	readonly inputs?: boolean;
	/** @deprecated Moved to PlanSettings.resourceWeights; only read by PlanSettingsNormalizer. */
	readonly resourceWeights?: Record<string, number>;
	readonly powerWeight?: number;
	readonly machinesWeight?: number;

}
