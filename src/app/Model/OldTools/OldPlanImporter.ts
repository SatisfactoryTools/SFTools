import {Injectable} from '@angular/core';
import {firstValueFrom} from 'rxjs';
import {timeout} from 'rxjs/operators';
import {PlannerGraphService} from '@src/Components/Planner/PlannerGraphService';
import {Data} from '@src/Model/Data/Data';
import {NotificationService} from '@src/Model/NotificationService';
import {OldGameVersion} from '@src/Model/OldTools/OldGameVersion';
import {OldPlanConversion} from '@src/Model/OldTools/OldPlanConversion';
import {OldPlanConverter} from '@src/Model/OldTools/OldPlanConverter';
import {OldPlanImport} from '@src/Model/OldTools/OldPlanImport';
import {OldProductionData} from '@src/Model/OldTools/OldProductionData';
import {OldResultConverter} from '@src/Model/OldTools/OldResultConverter';
import {OldToolsLegacySolverService} from '@src/Model/OldTools/OldToolsLegacySolverService';
import {Folder} from '@src/Model/Planner/Folder';
import {GraphEdgeBuilder} from '@src/Model/Planner/Graph/GraphEdgeBuilder';
import {GroupingModeResolver} from '@src/Model/Planner/GroupingModeResolver';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {ProductionSolverService} from '@src/Model/Planner/ProductionSolverService';
import {Node} from '@src/Model/Planner/Solver/Response/Node';
import {ProductNode} from '@src/Model/Planner/Solver/Response/ProductNode';

/** The old solver in the API answers in well under a second; anything longer is a stuck request. */
const LEGACY_SOLVE_TIMEOUT_MS = 40_000;

/** Provided by the planner, not the root: the graph layout is the planner's. */
@Injectable()
export class OldPlanImporter
{

	public constructor(
		private readonly converter: OldPlanConverter,
		private readonly resultConverter: OldResultConverter,
		private readonly legacySolver: OldToolsLegacySolverService,
		private readonly productionSolver: ProductionSolverService,
		private readonly groupingModes: GroupingModeResolver,
		private readonly edgeBuilder: GraphEdgeBuilder,
		private readonly plannerGraph: PlannerGraphService,
		private readonly planManager: PlanManager,
		private readonly notifications: NotificationService,
	)
	{
	}

	public convert(source: OldProductionData, data: Data): OldPlanConversion
	{
		return this.converter.convert(source, data);
	}

	public async withGraph(plan: Plan, source: OldProductionData, sourceVersion: OldGameVersion, data: Data): Promise<OldPlanImport>
	{
		const carried = this.nodesFromOldResult(source.result, plan, data);
		if (carried !== null) {
			return {plan: await this.layOut(plan, carried.nodes, carried.achievedMaximums), graphSource: 'carried'};
		}

		const legacy = this.nodesFromOldResult(await this.solveTheOldWay(source, sourceVersion), plan, data);
		if (legacy !== null) {
			return {plan: await this.layOut(plan, legacy.nodes, legacy.achievedMaximums), graphSource: 'legacy'};
		}

		try {
			const result = await firstValueFrom(this.productionSolver.solve(plan));
			if (result.status === 'Optimal' && result.nodes.length > 0) {
				return {plan: await this.layOut(plan, result.nodes, result.achievedMaximums), graphSource: 'solver'};
			}
		} catch {
			// Falls through to the empty plan.
		}
		return {plan, graphSource: 'none'};
	}

	public fileIntoFolder(plans: Plan[], folderName: string): Folder
	{
		const folder: Folder = {
			id: crypto.randomUUID(),
			name: folderName,
			parentId: null,
			settings: null,
			fixedGroups: [],
			resourcePool: false,
			revision: null,
		};
		this.planManager.importTree([folder], plans.map(plan => ({...plan, folderId: folder.id})));
		this.planManager.setActiveFolder(folder.id);
		return folder;
	}

	public announce(count: number, folderName: string, verb: 'Imported' | 'Copied'): void
	{
		this.notifications.showSuccess(`${verb} ${count} plan${count === 1 ? '' : 's'} from the old Satisfactory Tools into "${folderName}".`);
	}

	private async solveTheOldWay(source: OldProductionData, sourceVersion: OldGameVersion): Promise<Record<string, number> | undefined>
	{
		try {
			return await firstValueFrom(this.legacySolver.solve(source.request, sourceVersion).pipe(timeout(LEGACY_SOLVE_TIMEOUT_MS)));
		} catch {
			return undefined;
		}
	}

	/** Null when the result names anything this version lacks: a partial factory would mislead more than a recalculated one. */
	private nodesFromOldResult(
		result: Record<string, number> | undefined,
		plan: Plan,
		data: Data,
	): {nodes: Node[]; achievedMaximums: Record<string, number> | undefined} | null
	{
		if (!result || Object.keys(result).length === 0) {
			return null;
		}
		const conversion = this.resultConverter.convert(result, data, this.groupingModes.resolve(plan.settings));
		if (conversion.nodes.length === 0 || conversion.unknownClassNames.length > 0) {
			return null;
		}
		const maximised = new Set(plan.requests.filter(request => request.mode === 'maximise').map(request => request.itemClassName));
		let achievedMaximums: Record<string, number> | undefined;
		for (const node of conversion.nodes) {
			if (node instanceof ProductNode && maximised.has(node.item.className)) {
				achievedMaximums = {...achievedMaximums ?? {}, [node.item.className]: node.amount};
			}
		}
		return {nodes: conversion.nodes, achievedMaximums};
	}

	private async layOut(plan: Plan, nodes: Node[], achievedMaximums: Record<string, number> | undefined): Promise<Plan>
	{
		try {
			const edges = this.edgeBuilder.build(nodes);
			await this.plannerGraph.layout(nodes, edges, plan.settings.graph);
			return {
				...plan,
				graph: {nodes, edges},
				metadata: {...plan.metadata, achievedMaximums},
			};
		} catch {
			return plan;
		}
	}

}
