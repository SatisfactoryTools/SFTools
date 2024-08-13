/** The raw settings payload as stored and returned by the settings API. */
export interface SettingsSchema
{

	/** Full settings object serialized as a JSON string. */
	readonly data: string;

	/** Server revision counter; 0 means the user has never saved settings. */
	readonly revision: number;

}
