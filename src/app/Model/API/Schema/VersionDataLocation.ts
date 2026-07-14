/** Response of POST /v1/versions/{uuid}/data - the version's current data file location. */
export interface VersionDataLocation
{

	id: string;
	/** The current path - may differ from a previously seen one (generation inputs changed). */
	dataPath: string;

}
