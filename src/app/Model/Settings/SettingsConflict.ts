import {Settings} from '@src/Model/Settings/Settings';

/** A login-time clash between this device's settings and the account's. */
export interface SettingsConflict
{
	/** The signed-in account's settings (server). */
	readonly remote: Settings;
	/** This device's settings (localStorage). */
	readonly local: Settings;
}
