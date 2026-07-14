/**
 * Unlock progression extracted from a parsed Satisfactory save file. Entries
 * are bare class names exactly as the game stores them (Schematic_5-1_C,
 * Recipe_IronPlate_C) and are NOT validated against any dataset - a modded
 * save lists schematics and recipes from mods the Tools may not know about,
 * so consumers must filter against the active version's data.
 */
export interface SaveFileUnlocks
{
	/** The save's session name from the header, for user-facing confirmation. */
	readonly sessionName: string | null;
	/** Purchased schematics: milestones, MAM nodes, shop items, alternate recipes. */
	readonly schematics: string[];
	/**
	 * Unlocked recipes as the game itself resolved them from the schematics -
	 * includes build-gun (building) recipes, not only machine recipes.
	 */
	readonly recipes: string[];
}
