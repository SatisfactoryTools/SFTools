import {SaveSettingsSummary} from '@src/Model/SaveFile/SaveSettingsSummary';

/**
 * The plan-settings pieces a save file's unlocks map to, kept separate so
 * the consumer can apply any subset. Undefined follows the PlanSettings
 * semantics (disabledMachines: all machines enabled; enabledFuels: no
 * generators enabled).
 */
export interface SaveSettingsMapResult
{
	readonly enabledRecipes: string[];
	readonly disabledMachines: string[] | undefined;
	readonly enabledFuels: Record<string, string[]> | undefined;
	readonly summary: SaveSettingsSummary;
}
