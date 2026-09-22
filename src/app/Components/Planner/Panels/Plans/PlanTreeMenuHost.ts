import {Plan} from '@src/Model/Planner/Plan';
import {VisitedShare} from '@src/Model/Shares/VisitedShare';

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
	cloneFolder(id: string): void;
	deleteFolder(id: string, name: string): void;
	startRenamePlan(id: string, currentName: string): void;
	/** A cloned subplan is copied into the same parent plan, node included. */
	clonePlan(plan: Plan, displayName: string): void;
	deletePlan(plan: Plan): void;
	pickPlanIcon(plan: Plan): void;
	resetPlanIcon(plan: Plan): void;
	/** Always offered - a plan the server does not have is shared by sending its tree along. */
	sharePlan(plan: Plan): void;
	shareFolder(id: string, name: string): void;
	/** The same, for an "On this device" row (never on the server, even while signed in). */
	shareLocalItem(id: string, kind: 'plan' | 'folder', name: string): void;
	copyShareLink(share: VisitedShare): void;
	removeVisitedShare(share: VisitedShare): void;
	/** False while another game version is active - adding then switches to the share's version first. */
	isShareVersionActive(share: VisitedShare): boolean;
	/** Copies the share into the top level of the user's plans (of its own game version). */
	addShareToMyPlans(share: VisitedShare): void;
	/** Moves a plan/folder of this device into the user's account plans (a folder, or the top level). */
	addLocalToMyPlans(id: string, kind: 'plan' | 'folder', folderId?: string | null): void;
}
