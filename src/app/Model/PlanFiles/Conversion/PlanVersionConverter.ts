import {Injectable} from '@angular/core';
import {Data} from '@src/Model/Data/Data';
import {EnabledRecipesResolver} from '@src/Model/Planner/EnabledRecipesResolver';
import {Folder} from '@src/Model/Planner/Folder';
import {Graph} from '@src/Model/Planner/Graph/Graph';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanSerializer} from '@src/Model/Planner/PlanSerializer';
import {GraphVersionConverter} from '@src/Model/PlanFiles/Conversion/GraphVersionConverter';
import {ImportIssue} from '@src/Model/PlanFiles/Conversion/ImportIssue';
import {ImportIssueCollector} from '@src/Model/PlanFiles/Conversion/ImportIssueCollector';
import {PlanConversion} from '@src/Model/PlanFiles/Conversion/PlanConversion';
import {SettingsVersionConverter} from '@src/Model/PlanFiles/Conversion/SettingsVersionConverter';
import {VersionConversionContext} from '@src/Model/PlanFiles/Conversion/VersionConversionContext';

/** `target` must be the active version's data: the final revive check goes through PlanSerializer, which reads it. */
@Injectable({providedIn: 'root'})
export class PlanVersionConverter
{

	public constructor(
		private readonly graphs: GraphVersionConverter,
		private readonly settings: SettingsVersionConverter,
		private readonly enabledRecipes: EnabledRecipesResolver,
		private readonly serializer: PlanSerializer,
	)
	{
	}

	public convert(folders: readonly Folder[], plans: readonly Plan[], source: Data | null, target: Data): PlanConversion
	{
		const context = new VersionConversionContext(source, target, this.enabledRecipes.defaultSelection(target));
		const issues = new Map<string, ImportIssue[]>();
		const record = (id: string, collector: ImportIssueCollector): void => {
			const list = collector.issues();
			if (list.length > 0) {
				issues.set(id, list);
			}
		};

		const convertedFolders = folders.map(folder => {
			if (folder.settings === null) {
				return folder;
			}
			const collector = new ImportIssueCollector();
			const converted = {...folder, settings: this.settings.convert(folder.settings, context, collector)};
			record(folder.id, collector);
			return converted;
		});

		const convertedPlans = plans.map(plan => {
			const collector = new ImportIssueCollector();
			const converted = this.convertPlan(plan, context, collector);
			record(plan.id, collector);
			return converted;
		});

		return {folders: convertedFolders, plans: convertedPlans, issues};
	}

	private convertPlan(plan: Plan, context: VersionConversionContext, issues: ImportIssueCollector): Plan
	{
		const target = context.target;
		// An empty item is a blank row the user has not filled in yet, not a removed item.
		const requests = plan.requests.filter(request => {
			const exists = context.hasItem(request.itemClassName);
			if (!exists) {
				issues.warn(`Removed product: ${context.itemName(request.itemClassName)} - the item no longer exists`);
			}
			return exists;
		});
		const inputs = plan.inputs.filter(input => {
			const exists = context.hasItem(input.itemClassName);
			if (!exists) {
				issues.warn(`Removed input: ${context.itemName(input.itemClassName)} - the item no longer exists`);
			}
			return exists;
		});
		const achievedMaximums = plan.metadata.achievedMaximums === undefined ? undefined : Object.fromEntries(
			Object.entries(plan.metadata.achievedMaximums).filter(([className]) => context.hasItem(className)));
		const lostIcon = typeof plan.iconClassName === 'string' && target.iconForClassName(plan.iconClassName) === null;

		let graph = plan.graph;
		let recalculationNeeded = plan.metadata.recalculationNeeded;
		if (graph !== null) {
			const conversion = this.graphs.convert(graph, context, issues);
			graph = this.revivable(conversion.graph) ? conversion.graph : null;
			if (graph === null) {
				issues.warn('The production graph could not be converted and was removed - calculate the plan again');
			} else if (conversion.changed && graph.nodes.length > 0) {
				recalculationNeeded = true;
			}
		}

		return {
			...plan,
			settings: this.settings.convert(plan.settings, context, issues),
			requests,
			inputs,
			graph,
			metadata: {
				...plan.metadata,
				graphDirty: graph === null ? false : plan.metadata.graphDirty,
				achievedMaximums,
				recalculationNeeded,
			},
			...(lostIcon ? {iconClassName: undefined, autoIcon: true} : {}),
		};
	}

	/** The safety net for anything the converter does not know about: an unrevivable graph would break the plan on open. */
	private revivable(graph: Graph): boolean
	{
		try {
			this.serializer.reviveGraph(graph);
			return true;
		} catch {
			return false;
		}
	}

}
