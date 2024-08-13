import {Plan} from '@src/Model/Planner/Plan';

/**
 * Actions the Plans tree context menus call back into - implemented by
 * PlannerPlansComponent (an interface breaks the import cycle between the
 * component and its menu classes).
 */
export interface PlanTreeMenuHost
{
	startRenameFolder(id: string, currentName: string): void;
	startCreateFolder(parentId: string | null): void;
	startCreatePlan(parentId: string | null): void;
	deleteFolder(id: string, name: string): void;
	startRenamePlan(id: string, currentName: string): void;
	deletePlan(plan: Plan): void;
	pickPlanIcon(plan: Plan): void;
	resetPlanIcon(plan: Plan): void;
	/** Sharing needs an account and an active version - false hides the menu entries. */
	canShare(): boolean;
	sharePlan(plan: Plan): void;
	shareFolder(id: string, name: string): void;
}
