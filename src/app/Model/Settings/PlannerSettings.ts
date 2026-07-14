import {UnmakeableItemsDisplay} from '@src/Model/Settings/UnmakeableItemsDisplay';

/** Global planner behaviour settings (per-plan solver settings live in PlanSettings). */
export interface PlannerSettings
{

	readonly unmakeableItems: UnmakeableItemsDisplay;

}
