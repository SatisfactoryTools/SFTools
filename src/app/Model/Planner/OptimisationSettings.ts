export interface OptimisationSettings
{

	readonly rawResources?: boolean;
	readonly power?: boolean;
	readonly machines?: boolean;
	readonly inputs?: boolean;
	/** @deprecated Moved to PlanSettings.resourceWeights; only read by PlanSettingsNormalizer. */
	readonly resourceWeights?: Record<string, number>;
	readonly powerWeight?: number;
	readonly machinesWeight?: number;

}
