import {Folder} from '@src/Model/Planner/Folder';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanDataSerializer} from '@src/Model/Planner/PlanDataSerializer';
import {PlanStore} from '@src/Model/Planner/PlanStore';
import {OfflineMergeResult} from '@src/Model/Sync/OfflineMergeResult';
import {OfflineMerger} from '@src/Model/Sync/OfflineMerger';

export class PlanStoreOfflineMerger implements OfflineMerger<PlanStore>
{

	public merge(base: PlanStore | null, local: PlanStore, remote: PlanStore | null): OfflineMergeResult<PlanStore>
	{
		const remoteStore = remote ?? {folders: [], plans: []};
		const baseStore = base ?? {folders: [], plans: []};

		const folders = this.mergeEntries(baseStore.folders, local.folders, remoteStore.folders, folder => this.folderSignature(folder), false);
		const plans = this.mergeEntries(baseStore.plans, local.plans, remoteStore.plans, plan => this.planSignature(plan), true);

		const copies = plans.conflicts.map(plan => ({
			...plan,
			id: crypto.randomUUID(),
			name: `${plan.name} (offline copy)`,
			revision: null,
		}));
		const mergedFolders = folders.entries;
		const folderIds = new Set(mergedFolders.map(folder => folder.id));
		const allPlans = [...plans.entries, ...copies];
		const planIds = new Set(allPlans.map(plan => plan.id));

		const store: PlanStore = {
			folders: mergedFolders.map(folder => folder.parentId !== null && !folderIds.has(folder.parentId) ? {...folder, parentId: null} : folder),
			plans: allPlans.map(plan => {
				const folderId = plan.folderId !== null && !folderIds.has(plan.folderId) ? null : plan.folderId;
				const parentPlanId = plan.parentPlanId !== null && !planIds.has(plan.parentPlanId) ? null : plan.parentPlanId;
				return folderId === plan.folderId && parentPlanId === plan.parentPlanId ? plan : {...plan, folderId, parentPlanId};
			}),
		};

		return {
			data: store,
			changed: folders.changed || plans.changed || copies.length > 0,
			conflicts: copies.length,
		};
	}

	public unsynced(base: PlanStore | null, local: PlanStore): Plan[]
	{
		const baseSignatures = new Map((base?.plans ?? []).map(plan => [plan.id, this.planSignature(plan)]));
		return local.plans.filter(plan => baseSignatures.get(plan.id) !== this.planSignature(plan));
	}

	private mergeEntries<E extends {id: string}>(base: E[], local: E[], remote: E[], signature: (entry: E) => string, keepBoth: boolean): {entries: E[]; conflicts: E[]; changed: boolean}
	{
		const baseById = new Map(base.map(entry => [entry.id, entry]));
		const localById = new Map(local.map(entry => [entry.id, entry]));
		const remoteById = new Map(remote.map(entry => [entry.id, entry]));
		// Remote order first, then entries only this device has, in its order.
		const ids = [...new Set([...remote.map(entry => entry.id), ...local.map(entry => entry.id), ...base.map(entry => entry.id)])];

		const entries: E[] = [];
		const conflicts: E[] = [];
		let changed = false;
		for (const id of ids) {
			const baseEntry = baseById.get(id);
			const localEntry = localById.get(id);
			const remoteEntry = remoteById.get(id);
			const baseSignature = baseEntry === undefined ? null : signature(baseEntry);
			const localSignature = localEntry === undefined ? null : signature(localEntry);
			const remoteSignature = remoteEntry === undefined ? null : signature(remoteEntry);

			let kept: E | undefined;
			if (localSignature === baseSignature || localSignature === remoteSignature) {
				kept = remoteEntry;
			} else if (remoteSignature === baseSignature) {
				kept = localEntry;
			} else if (localEntry === undefined || remoteEntry === undefined) {
				kept = localEntry ?? remoteEntry;
			} else if (keepBoth) {
				kept = remoteEntry;
				conflicts.push(localEntry);
			} else {
				kept = localEntry;
			}

			if (kept !== undefined) {
				entries.push(kept);
			}
			if (kept !== remoteEntry) {
				changed = true;
			}
		}
		return {entries, conflicts, changed};
	}

	private planSignature(plan: Plan): string
	{
		return JSON.stringify([
			plan.name,
			plan.description ?? '',
			plan.folderId,
			plan.parentPlanId,
			plan.linkAccess ?? true,
			// A round trip, so a revived graph and its stored form compare equal.
			JSON.parse(PlanDataSerializer.plan(plan)),
		]);
	}

	private folderSignature(folder: Folder): string
	{
		return JSON.stringify([folder.name, folder.parentId, JSON.parse(PlanDataSerializer.folder(folder))]);
	}

}
