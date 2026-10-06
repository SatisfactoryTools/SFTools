import {Observable, map, of} from 'rxjs';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {Folder} from '@src/Model/Planner/Folder';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanSettingsNormalizer} from '@src/Model/Planner/PlanSettingsNormalizer';
import {PlanStore} from '@src/Model/Planner/PlanStore';
import {PlannerLocationService} from '@src/Model/Planner/PlannerLocationService';
import {AppStorage} from '@src/Model/Storage/AppStorage';
import {DataBackend} from '@src/Model/Sync/DataBackend';
import {LocalStorageDataBackend} from '@src/Model/Sync/LocalStorageDataBackend';

/** The pre-2026-09 single store, before local plans were split by game version. */
const LEGACY_KEY = 'sftools.plans';
const KEY_PREFIX = 'sftools.plans.';

/** Older raw JSON lacks fields added since and, unlike the API backend, nothing hydrates it, so defaults are filled in here at the source. */
export class LocalPlanStoreBackend implements DataBackend<PlanStore>
{

	public constructor(
		private readonly storage: AppStorage,
		private readonly versionManager: VersionManager,
		private readonly plannerLocation: PlannerLocationService,
	)
	{
	}

	public countPlans(versionId: string): number
	{
		const raw = this.storage.getItem(KEY_PREFIX + versionId);
		if (raw === null) {
			return 0;
		}
		try {
			return ((JSON.parse(raw) as PlanStore).plans ?? []).filter(plan => (plan.parentPlanId ?? null) === null).length;
		} catch {
			return 0;
		}
	}

	public load(): Observable<PlanStore | null>
	{
		this.migrateLegacyStore();
		const storage = this.activeStorage();
		if (storage === null) {
			return of(null);
		}
		return storage.load().pipe(map(store => store === null ? null : this.upgrade(store)));
	}

	public save(data: PlanStore): Observable<void>
	{
		return this.activeStorage()?.save(data) ?? of(void 0);
	}

	public clear(): Observable<void>
	{
		return this.activeStorage()?.clear() ?? of(void 0);
	}

	private activeStorage(): LocalStorageDataBackend<PlanStore> | null
	{
		const version = this.versionManager.activeVersion();
		return version === null ? null : new LocalStorageDataBackend<PlanStore>(this.storage, KEY_PREFIX + version.id);
	}

	private migrateLegacyStore(): void
	{
		const raw = this.storage.getItem(LEGACY_KEY);
		if (raw === null) {
			return;
		}
		const versions = this.versionManager.versions();
		const lastSlug = this.plannerLocation.location()?.versionSlug ?? null;
		const target = (lastSlug === null ? null : this.versionManager.findByUrlSlug(lastSlug))
			?? versions.find(version => !version.custom)
			?? null;
		if (target === null) {
			return;
		}

		let legacy: PlanStore;
		try {
			legacy = JSON.parse(raw) as PlanStore;
		} catch {
			this.storage.removeItem(LEGACY_KEY);
			return;
		}

		const storage = new LocalStorageDataBackend<PlanStore>(this.storage, KEY_PREFIX + target.id);
		storage.load().subscribe(existing => {
			const merged: PlanStore = {
				folders: [...(existing?.folders ?? []), ...(legacy.folders ?? [])],
				plans: [...(existing?.plans ?? []), ...(legacy.plans ?? [])],
			};
			storage.save(merged).subscribe();
			this.storage.removeItem(LEGACY_KEY);
		});
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
