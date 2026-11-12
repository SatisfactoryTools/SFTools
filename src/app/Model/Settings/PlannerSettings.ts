import {CalculatorTab} from '@src/Components/Planner/Panels/Calculator/CalculatorTab';
import {ShareLinkMode} from '@src/Model/Settings/ShareLinkMode';
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

	/** 'live' falls back to a snapshot where there is no plan link to send (folders, plans saved on the device). */
	readonly shareLink: ShareLinkMode;

	readonly keepShareWindowOpen: boolean;

}
