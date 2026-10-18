import {Injectable} from '@angular/core';
import {PlanDataSerializer} from '@src/Model/Planner/PlanDataSerializer';
import {PlanTreeFolder} from '@src/Model/Planner/PlanTreeFolder';
import {PlanTreePlan} from '@src/Model/Planner/PlanTreePlan';
import {PlanExportSelection} from '@src/Model/PlanFiles/PlanExportSelection';
import {PlanFileRoot} from '@src/Model/PlanFiles/PlanFileRoot';
import {PortableFolderNode} from '@src/Model/Shares/PortableFolderNode';
import {PortablePlanNode} from '@src/Model/Shares/PortablePlanNode';

/** Unselected folders around selected content are kept, so the import mirrors the structure the user sees. */
@Injectable({providedIn: 'root'})
export class PlanExportTreeBuilder
{

	public build(entries: readonly (PlanTreeFolder | PlanTreePlan)[], selection: PlanExportSelection): PlanFileRoot[]
	{
		return this.rootEntries(entries, selection).map(entry => 'folder' in entry
			? {type: 'folder' as const, node: this.folderNode(entry, selection)!}
			: {type: 'plan' as const, node: this.planNode(entry)});
	}

	/** What becomes a top-level entry of the file - cheap, for naming the file while the selection changes. */
	public rootEntries(entries: readonly (PlanTreeFolder | PlanTreePlan)[], selection: PlanExportSelection): (PlanTreeFolder | PlanTreePlan)[]
	{
		return entries.flatMap<PlanTreeFolder | PlanTreePlan>(entry => 'folder' in entry
			? (this.hasContent(entry, selection) ? [entry] : [])
			: this.selectedPlans(entry, selection));
	}

	private hasContent(entry: PlanTreeFolder, selection: PlanExportSelection): boolean
	{
		return selection.folderIds.has(entry.folder.id)
			|| entry.children.some(child => this.hasContent(child, selection))
			|| entry.plans.some(plan => this.selectedPlans(plan, selection).length > 0);
	}

	private selectedPlans(entry: PlanTreePlan, selection: PlanExportSelection): PlanTreePlan[]
	{
		return selection.planIds.has(entry.plan.id) ? [entry] : entry.subplans.flatMap(subplan => this.selectedPlans(subplan, selection));
	}

	private folderNode(entry: PlanTreeFolder, selection: PlanExportSelection): PortableFolderNode | null
	{
		const children = entry.children
			.map(child => this.folderNode(child, selection))
			.filter((child): child is PortableFolderNode => child !== null);
		const plans = entry.plans.flatMap(plan => this.planNodes(plan, selection));
		if (children.length === 0 && plans.length === 0 && !selection.folderIds.has(entry.folder.id)) {
			return null;
		}
		return {
			id: entry.folder.id,
			name: entry.folder.name,
			data: PlanDataSerializer.folder(entry.folder),
			children,
			plans,
		};
	}

	/** An unselected plan contributes its selected subplans as standalone plans. */
	private planNodes(entry: PlanTreePlan, selection: PlanExportSelection): PortablePlanNode[]
	{
		return this.selectedPlans(entry, selection).map(selected => this.planNode(selected));
	}

	private planNode(entry: PlanTreePlan): PortablePlanNode
	{
		return {
			id: entry.plan.id,
			name: entry.plan.name,
			description: entry.plan.description || null,
			data: PlanDataSerializer.plan(entry.plan),
			subplans: entry.subplans.map(subplan => this.planNode(subplan)),
		};
	}

}
