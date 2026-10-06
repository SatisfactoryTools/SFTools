import {Plan} from '@src/Model/Planner/Plan';
import {PlanStore} from '@src/Model/Planner/PlanStore';
import {PlanStoreOfflineMerger} from '@src/Model/Planner/PlanStoreOfflineMerger';
import {AppStorage} from '@src/Model/Storage/AppStorage';
import {OfflineMirror} from '@src/Model/Sync/OfflineMirror';
import {OfflineMirrorBackend} from '@src/Model/Sync/OfflineMirrorBackend';

const MIRROR_PREFIX = `${OfflineMirrorBackend.KEY_PREFIX}plans.`;
const DEVICE_PREFIX = 'sftools.plans.';

/**
 * Signing out removes the offline copies of the account's plans; edits that never
 * reached the account (session expired while offline) are first copied into the device's plans.
 */
export class UnsyncedPlanRescue
{

	private readonly merger = new PlanStoreOfflineMerger();

	public constructor(private readonly storage: AppStorage)
	{
	}

	public run(): number
	{
		let rescued = 0;
		for (const key of this.storage.keys(MIRROR_PREFIX)) {
			const mirror = this.read<OfflineMirror<PlanStore>>(key);
			if (mirror?.local == null) {
				continue;
			}
			const plans = this.merger.unsynced(mirror.base, mirror.local);
			if (plans.length > 0) {
				this.keep(key.slice(MIRROR_PREFIX.length), plans);
				rescued += plans.length;
			}
		}
		return rescued;
	}

	private keep(versionId: string, plans: Plan[]): void
	{
		// New ids: the originals still exist in the account.
		const ids = new Map(plans.map(plan => [plan.id, crypto.randomUUID()]));
		const copies: Plan[] = plans.map(plan => ({
			...plan,
			id: ids.get(plan.id)!,
			name: `${plan.name} (not saved to your account)`,
			folderId: null,
			parentPlanId: plan.parentPlanId === null ? null : ids.get(plan.parentPlanId) ?? null,
			revision: null,
		}));
		const key = DEVICE_PREFIX + versionId;
		const store = this.read<PlanStore>(key) ?? {folders: [], plans: []};
		this.storage.setItem(key, JSON.stringify({folders: store.folders ?? [], plans: [...(store.plans ?? []), ...copies]}));
	}

	private read<T>(key: string): T | null
	{
		try {
			return JSON.parse(this.storage.getItem(key) ?? 'null') as T | null;
		} catch {
			return null;
		}
	}

}
