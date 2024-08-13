/** One labelled version of a mod; its data file (if any) is served at data/mods/{id}.json. */
export interface ModVersion
{

	id: string;
	/** Id of the owning mod. */
	mod: string;
	/** Version label, e.g. "1.0" - unrelated to game versions. */
	name: string;
	hasData: boolean;
	createdAt: string;

}
