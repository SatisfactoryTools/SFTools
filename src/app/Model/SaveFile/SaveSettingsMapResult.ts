import {SaveSettingsSummary} from '@src/Model/SaveFile/SaveSettingsSummary';

export interface SaveSettingsMapResult
{
	readonly enabledRecipes: string[];
	readonly disabledMachines: string[] | undefined;
	readonly enabledFuels: Record<string, string[]> | undefined;
	readonly summary: SaveSettingsSummary;
}
