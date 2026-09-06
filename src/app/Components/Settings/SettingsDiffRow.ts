/** One differing preference in the login-time settings conflict dialog. */
export interface SettingsDiffRow
{
	/** Section the setting belongs to (Numbers, Graph, …). */
	readonly group: string;
	readonly label: string;
	/** The account's value, already formatted for display. */
	readonly remote: string;
	/** This device's value, already formatted for display. */
	readonly local: string;
	/** Set for colour settings - rendered as swatches next to the hex codes. */
	readonly remoteColor?: string;
	readonly localColor?: string;
}
