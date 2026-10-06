export interface SaveSettingsSummary
{
	readonly sessionName: string | null;
	readonly machinesEnabled: number;
	readonly machinesTotal: number;
	readonly recipesEnabled: number;
	readonly recipesTotal: number;
	readonly generatorsEnabled: number;
	readonly generatorsTotal: number;
	readonly unknownEntries: number;
}
