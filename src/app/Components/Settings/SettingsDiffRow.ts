export interface SettingsDiffRow
{
	readonly group: string;
	readonly label: string;
	readonly remote: string;
	readonly local: string;
	readonly remoteColor?: string;
	readonly localColor?: string;
}
