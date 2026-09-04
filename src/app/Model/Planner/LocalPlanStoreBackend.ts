import {Observable, map} from 'rxjs';
import {Folder} from '@src/Model/Planner/Folder';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanSettingsNormalizer} from '@src/Model/Planner/PlanSettingsNormalizer';
import {PlanStore} from '@src/Model/Planner/PlanStore';
import {DataBackend} from '@src/Model/Sync/DataBackend';
import {LocalStorageDataBackend} from '@src/Model/Sync/LocalStorageDataBackend';

/**
 * The localStorage plan store, upgraded on load: raw JSON saved by older
 * builds lacks fields added since (folder fixed groups, plan metadata), and
 * unlike the API backend nothing hydrates it - so the defaults are filled in
 * here, once, at the source every local read goes through.
 */
export class LocalPlanStoreBackend implements DataBackend<PlanStore>
{

	private readonly storage: LocalStorageDataBackend<PlanStore>;

	public constructor(key: string)
	{
		this.storage = new LocalStorageDataBackend<PlanStore>(key);
	}

	public load(): Observable<PlanStore | null>
	{
		return this.storage.load().pipe(map(store => store === null ? null : this.upgrade(store)));
	}

	public save(data: PlanStore): Observable<void>
	{
		return this.storage.save(data);
	}

	public clear(): Observable<void>
	{
		return this.storage.clear();
	}

	private upgrade(store: PlanStore): PlanStore
	{
		return {
			folders: (store.folders ?? []).map(folder => this.upgradeFolder(folder)),
			plans: (store.plans ?? []).map(plan => this.upgradePlan(plan)),
		};
	}

	private upgradeFolder(folder: Folder): Folder
	{
		return {
			...folder,
			settings: folder.settings ? PlanSettingsNormalizer.normalize(folder.settings) : null,
			fixedGroups: folder.settings ? folder.fixedGroups ?? [] : [],
			resourcePool: folder.resourcePool ?? false,
		};
	}

	private upgradePlan(plan: Plan): Plan
	{
		return {
			...plan,
			settings: PlanSettingsNormalizer.normalize({...plan.settings, calculationMode: plan.settings?.calculationMode ?? 'automatic'}),
			requests: plan.requests ?? [],
			inputs: plan.inputs ?? [],
			metadata: plan.metadata ?? {graphDirty: false},
		};
	}

}
