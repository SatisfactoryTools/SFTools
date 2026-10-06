export interface PlanMetadata
{

	readonly graphDirty: boolean;

	readonly achievedMaximums?: Record<string, number>;

	readonly recalculationNeeded?: boolean;

}
