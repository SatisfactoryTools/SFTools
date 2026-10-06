export interface SettingsFieldLabel
{
	readonly label: string;
	readonly format?: (value: unknown) => string;
}
