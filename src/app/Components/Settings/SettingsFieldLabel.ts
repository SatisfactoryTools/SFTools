/** How one settings field is named and rendered in the conflict dialog. */
export interface SettingsFieldLabel
{
	readonly label: string;
	/** Turns the raw value into display text; String() when omitted. */
	readonly format?: (value: unknown) => string;
}
