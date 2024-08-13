import {Injectable} from '@angular/core';
import {SharedFolderNode} from '@src/Model/API/Schema/Shares/SharedFolderNode';
import {SharedPlanNode} from '@src/Model/API/Schema/Shares/SharedPlanNode';
import {SharePayload} from '@src/Model/API/Schema/Shares/SharePayload';
import {Folder} from '@src/Model/Planner/Folder';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {SharedPlanData} from '@src/Model/Shares/SharedPlanData';

/**
 * Copies a frozen share into the viewer's own plans. Every folder and plan
 * gets a fresh UUID (the payload carries the sharer's originals), and
 * subplan references inside saved graphs are remapped to the new ids so
 * copied parent plans keep pointing at their copied subplans.
 */
@Injectable({providedIn: 'root'})
export class ShareImportService
{

	public constructor(private readonly planManager: PlanManager)
	{
	}

	public import(payload: SharePayload): void
	{
		// Pass 1: a fresh id for every node, so graphs can be remapped in pass 2.
		const idMap = new Map<string, string>();
		if (payload.type === 'folder') {
			this.mapFolderIds(payload.root as SharedFolderNode, idMap);
		} else {
			this.mapPlanIds(payload.root as SharedPlanNode, idMap);
		}

		const folders: Folder[] = [];
		const plans: Plan[] = [];
		if (payload.type === 'folder') {
			this.copyFolder(payload.root as SharedFolderNode, null, idMap, folders, plans);
		} else {
			this.copyPlan(payload.root as SharedPlanNode, null, null, idMap, plans);
		}

		this.planManager.importTree(folders, plans);
	}

	private mapFolderIds(node: SharedFolderNode, idMap: Map<string, string>): void
	{
		idMap.set(node.id, crypto.randomUUID());
		node.children.forEach(child => this.mapFolderIds(child, idMap));
		node.plans.forEach(plan => this.mapPlanIds(plan, idMap));
	}

	private mapPlanIds(node: SharedPlanNode, idMap: Map<string, string>): void
	{
		idMap.set(node.id, crypto.randomUUID());
		node.subplans.forEach(sub => this.mapPlanIds(sub, idMap));
	}

	private copyFolder(
		node: SharedFolderNode,
		parentId: string | null,
		idMap: Map<string, string>,
		folders: Folder[],
		plans: Plan[],
	): void
	{
		let data: {settings?: Folder['settings']} = {};
		try {
			data = JSON.parse(node.data) as typeof data;
		} catch {
			// malformed data - treat as inheriting
		}
		folders.push({
			id: idMap.get(node.id)!,
			name: node.name,
			parentId,
			settings: data.settings ?? null,
			revision: null,
		});
		node.children.forEach(child => this.copyFolder(child, idMap.get(node.id)!, idMap, folders, plans));
		node.plans.forEach(plan => this.copyPlan(plan, idMap.get(node.id)!, null, idMap, plans));
	}

	private copyPlan(
		node: SharedPlanNode,
		folderId: string | null,
		parentPlanId: string | null,
		idMap: Map<string, string>,
		plans: Plan[],
	): void
	{
		let data: SharedPlanData = {};
		try {
			data = JSON.parse(node.data) as SharedPlanData;
		} catch {
			// malformed data - copy an empty plan shell
		}
		const id = idMap.get(node.id)!;
		plans.push({
			id,
			name: node.name,
			description: node.description ?? '',
			folderId,
			parentPlanId,
			settings: {
				...data.settings,
				calculationMode: data.settings?.calculationMode ?? 'automatic',
			},
			requests: data.requests ?? [],
			inputs: data.inputs ?? [],
			graph: this.remapGraph(data.graph ?? null, idMap),
			metadata: {graphDirty: data.metadata?.graphDirty ?? false},
			iconClassName: data.iconClassName,
			revision: null,
		});
		node.subplans.forEach(sub => this.copyPlan(sub, null, id, idMap, plans));
	}

	/** Points subplan nodes of a saved (raw JSON) graph at the copied plan ids. */
	private remapGraph(graph: Plan['graph'], idMap: Map<string, string>): Plan['graph']
	{
		if (graph === null || !Array.isArray(graph.nodes)) {
			return graph;
		}
		return {
			...graph,
			nodes: graph.nodes.map(node => {
				const subplanId = (node as unknown as {subplanId?: string}).subplanId;
				if (typeof subplanId === 'string' && idMap.has(subplanId)) {
					return {...node, subplanId: idMap.get(subplanId)!} as unknown as typeof node;
				}
				return node;
			}),
		};
	}

}
