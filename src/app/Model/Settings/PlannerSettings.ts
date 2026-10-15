import {CalculatorTab} from '@src/Components/Planner/Panels/Calculator/CalculatorTab';
import {TabLabelsMode} from '@src/Model/Settings/TabLabelsMode';
import {UnmakeableItemsDisplay} from '@src/Model/Settings/UnmakeableItemsDisplay';

export interface PlannerSettings
{

	readonly unmakeableItems: UnmakeableItemsDisplay;

	readonly tabBadges: boolean;

	readonly tabLabels: TabLabelsMode;

	readonly groupTabs: boolean;

	readonly moreTabs: readonly CalculatorTab[];

	readonly helpButtons: boolean;

}
