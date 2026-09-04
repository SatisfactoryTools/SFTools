import {TabLabelsMode} from '@src/Model/Settings/TabLabelsMode';
import {UnmakeableItemsDisplay} from '@src/Model/Settings/UnmakeableItemsDisplay';

/** Global planner behaviour settings (per-plan solver settings live in PlanSettings). */
export interface PlannerSettings
{

	readonly unmakeableItems: UnmakeableItemsDisplay;

	/** Small counts on the production request tabs (items requested, recipes enabled…). */
	readonly tabBadges: boolean;

	/** Label display of the production request tabs. */
	readonly tabLabels: TabLabelsMode;

}
