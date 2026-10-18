import {Injectable} from '@angular/core';
import {CollapsedSectionsService} from '@src/Components/Common/CollapsedSectionsService';
import {CollapsibleSections} from '@src/Components/Common/CollapsibleSections';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanManager} from '@src/Model/Planner/PlanManager';

/** Shared by the Plans panel and the planner rail, which can create a plan while the panel is closed. */
@Injectable({providedIn: 'root'})
export class PlanCreator
{

	public static readonly ROOT_SECTION = '__root__';

	public readonly foldState: CollapsibleSections;

	public constructor(
		private readonly planManager: PlanManager,
		collapsedSections: CollapsedSectionsService,
	)
	{
		this.foldState = new CollapsibleSections(collapsedSections, 'plans');
	}

	public currentFolderId(): string | null
	{
		const folder = this.planManager.activeFolder();
		if (folder !== null) {
			return folder.id;
		}
		const plan = this.planManager.activePlan();
		if (plan === null || this.planManager.activePlanReadOnly()) {
			return null;
		}
		return this.rootPlanOf(plan).folderId;
	}

	public createPlan(parentId: string | null = this.currentFolderId()): Plan
	{
		this.reveal(parentId);
		const plan = this.planManager.createPlan('', parentId);
		this.planManager.setActivePlan(plan.id);
		return plan;
	}

	/** A collapsed section or folder would hide the new row / inline input added inside it. */
	public reveal(folderId: string | null): void
	{
		this.foldState.set(PlanCreator.ROOT_SECTION, true);
		const folders = this.planManager.folders();
		const seen = new Set<string>();
		for (let id = folderId; id !== null && !seen.has(id); id = folders.find(folder => folder.id === id)?.parentId ?? null) {
			seen.add(id);
			this.foldState.set(id, true);
		}
	}

	private rootPlanOf(plan: Plan): Plan
	{
		let current = plan;
		const seen = new Set<string>([current.id]);
		while (current.parentPlanId !== null) {
			const parent = this.planManager.findPlan(current.parentPlanId);
			// A dangling or looping parent id would otherwise spin forever.
			if (parent === null || seen.has(parent.id)) {
				break;
			}
			seen.add(parent.id);
			current = parent;
		}
		return current;
	}

}
