import {PlanSettings} from '@src/Model/Planner/PlanSettings';
import {SettingsGroup} from '@src/Model/Planner/SettingsGroup';

export interface Folder
{
	readonly id: string;
	readonly name: string;
	readonly parentId: string | null;
	readonly settings: PlanSettings | null;
	readonly fixedGroups: SettingsGroup[];
	readonly resourcePool: boolean;
	readonly order?: number;
	readonly revision: number | null;
}
