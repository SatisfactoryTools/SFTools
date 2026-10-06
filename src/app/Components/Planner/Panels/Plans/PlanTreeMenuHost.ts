import {Plan} from '@src/Model/Planner/Plan';
import {VisitedShare} from '@src/Model/Shares/VisitedShare';

/** Implemented by PlannerPlansComponent; an interface breaks the import cycle with the menu classes. */
export interface PlanTreeMenuHost
{
	startRenameFolder(id: string, currentName: string): void;
	startCreateFolder(parentId: string | null): void;
	startCreatePlan(parentId: string | null): void;
	cloneFolder(id: string): void;
	deleteFolder(id: string, name: string): void;
	startRenamePlan(id: string, currentName: string): void;
	clonePlan(plan: Plan, displayName: string): void;
	deletePlan(plan: Plan): void;
	pickPlanIcon(plan: Plan): void;
	resetPlanIcon(plan: Plan): void;
	sharePlan(plan: Plan): void;
	shareFolder(id: string, name: string): void;
	shareLocalItem(id: string, kind: 'plan' | 'folder', name: string): void;
	copyShareLink(share: VisitedShare): void;
	removeVisitedShare(share: VisitedShare): void;
	isShareVersionActive(share: VisitedShare): boolean;
	addShareToMyPlans(share: VisitedShare): void;
	addLocalToMyPlans(id: string, kind: 'plan' | 'folder', folderId?: string | null): void;
}
