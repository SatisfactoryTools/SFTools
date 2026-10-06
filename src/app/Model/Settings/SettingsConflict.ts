import {Settings} from '@src/Model/Settings/Settings';

export interface SettingsConflict
{
	readonly remote: Settings;
	readonly local: Settings;
}
