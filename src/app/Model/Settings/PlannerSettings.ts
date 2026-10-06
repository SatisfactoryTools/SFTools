import {TabLabelsMode} from '@src/Model/Settings/TabLabelsMode';
import {UnmakeableItemsDisplay} from '@src/Model/Settings/UnmakeableItemsDisplay';

export interface PlannerSettings
{

	readonly unmakeableItems: UnmakeableItemsDisplay;

	readonly tabBadges: boolean;

	readonly tabLabels: TabLabelsMode;

	readonly helpButtons: boolean;

}
