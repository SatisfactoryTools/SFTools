import {Injectable} from '@angular/core';
import {GroupingMode} from '@src/Model/Planner/GroupingMode';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';

/**
 * Resolves the machine-group arrangement new nodes of a plan start with: the
 * plan's own choice, or the user's plan default while it has none.
 */
@Injectable({providedIn: 'root'})
export class GroupingModeResolver
{

	public constructor(private readonly settings: SettingsManager)
	{
	}

	public resolve(settings: PlanSettings | null | undefined): GroupingMode
	{
		return settings?.defaultGroupingMode ?? this.settings.planDefaults().groupingMode;
	}

}
