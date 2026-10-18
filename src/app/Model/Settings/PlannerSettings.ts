import {CalculatorTab} from '@src/Components/Planner/Panels/Calculator/CalculatorTab';
import {RailSize} from '@src/Model/Settings/RailSize';
import {TabLabelsMode} from '@src/Model/Settings/TabLabelsMode';
import {UnmakeableItemsDisplay} from '@src/Model/Settings/UnmakeableItemsDisplay';

export interface PlannerSettings
{

	readonly unmakeableItems: UnmakeableItemsDisplay;

	readonly railSize: RailSize;

	readonly tabBadges: boolean;

	readonly tabLabels: TabLabelsMode;

	readonly groupTabs: boolean;

	readonly moreTabs: readonly CalculatorTab[];

	readonly helpButtons: boolean;

	/** Viewer-side only: the hearts on supporters' shared plans. Link previews are not affected. */
	readonly supporterHearts: boolean;

}
