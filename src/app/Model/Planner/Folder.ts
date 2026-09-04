import {PlanSettings} from '@src/Model/Planner/PlanSettings';
import {SettingsGroup} from '@src/Model/Planner/SettingsGroup';

export interface Folder
{
	readonly id: string;
	readonly name: string;
	readonly parentId: string | null;
	/**
	 * Custom default solver settings for plans and subfolders created inside;
	 * null (or absent on folders stored before this existed) means the folder
	 * inherits from its parent. Stored under the "settings" key of the API's
	 * opaque folder `data` JSON, so more keys can join later.
	 */
	readonly settings: PlanSettings | null;
	/**
	 * Settings groups whose folder values are pushed into every inner plan
	 * (nested plain folders and subplans included) and read-only there.
	 * Empty unless the folder has custom settings. Stored under "fixedGroups".
	 */
	readonly fixedGroups: SettingsGroup[];
	/**
	 * With the resources group fixed: every limited raw resource is one pool
	 * shared by all inner plans instead of a per-plan cap. Stored under
	 * "resourcePool".
	 */
	readonly resourcePool: boolean;
	/**
	 * Manual position among siblings; absent = sorted alphabetically after
	 * the ordered siblings (see PlanManager.buildTree). Stored under "order".
	 */
	readonly order?: number;
	/** Server revision counter guarding folder updates; null before first sync. */
	readonly revision: number | null;
}
