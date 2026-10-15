import {Settings} from '@src/Model/Settings/Settings';

/** Panel positions are left out: they belong to the device layout and have their own reset on the Planner page. */
export type SettingsCategory = Exclude<keyof Settings, 'panels'>;
