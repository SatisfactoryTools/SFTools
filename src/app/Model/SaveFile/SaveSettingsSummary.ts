/** What applying a save file's unlocks to plan settings would change - shown for confirmation. */
export interface SaveSettingsSummary
{
	readonly sessionName: string | null;
	readonly machinesEnabled: number;
	readonly machinesTotal: number;
	readonly recipesEnabled: number;
	readonly recipesTotal: number;
	readonly generatorsEnabled: number;
	readonly generatorsTotal: number;
	/**
	 * Save entries (schematics + recipes) unknown to the active version's
	 * dataset and therefore ignored - typically unlocks from mods that are
	 * not part of this version.
	 */
	readonly unknownEntries: number;
}
