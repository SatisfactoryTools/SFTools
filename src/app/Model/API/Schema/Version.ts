export interface Version
{

	id: string;
	name: string;
	/** Null for custom versions - they are addressed by their id instead. */
	slug: string | null;
	experimental: boolean;
	custom: boolean;
	dataPath: string;
	/** The public version a custom version was derived from; null for public versions. */
	baseVersion: string | null;
	/** Recipe-cost (ingredient amount) multiplier baked into the data file; 1 for public versions. */
	recipeCost: number;
	/** Power-consumption multiplier baked into the data file; 1 for public versions. */
	powerCost: number;
	/** Mod version ids merged into this version's data; empty for public versions. */
	mods: string[];

}
