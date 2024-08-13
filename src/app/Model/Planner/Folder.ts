import {PlanSettings} from '@src/Model/Planner/PlanSettings';

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
	/** Server revision counter guarding folder updates; null before first sync. */
	readonly revision: number | null;
}
