import {computed, Injectable, Signal} from '@angular/core';
import {MapTargetSource} from '@src/Components/Map/MapTargetSource';
import {MapPlanDefaults} from '@src/Model/Map/MapPlanDefaults';
import {MapTarget} from '@src/Model/Map/MapTarget';
import {MapConveyors} from '@src/Model/Planner/MapConveyors';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';

/** The map's own settings live in the plan's or folder's settings, next to the limits they produce. */
@Injectable()
export class MapPlanSettingsService
{

	public readonly target: Signal<MapTarget | null> = computed(() => this.targets.target());

	/** A folder without its own settings shows what its plans start from. */
	public readonly settings: Signal<PlanSettings | null> = computed(() => {
		const target = this.target();
		if (target === null) {
			return null;
		}
		return target.settings ?? (target.folder !== null ? this.planManager.effectiveFolderSettings(target.folder.id) : null);
	});

	public readonly conveyors: Signal<MapConveyors> = computed(() => this.settings()?.mapConveyors ?? MapPlanDefaults.CONVEYORS);

	/** Why nothing can be saved to the target; null when it can. */
	public readonly blocker: Signal<string | null> = computed(() => {
		const target = this.target();
		if (target === null) {
			return this.targets.selectable ? 'Choose a plan or folder first.' : 'Open a plan or folder first.';
		}
		if (target.plan !== null) {
			if (this.planManager.isSharedPlan(target.plan.id)) {
				return 'This plan belongs to someone else. It is read-only.';
			}
			return this.planManager.isLocalPlan(target.plan.id) ? 'This plan is saved only on this device. It is read-only here.' : null;
		}
		const folder = target.folder!;
		if (!this.planManager.folders().some(f => f.id === folder.id)) {
			return 'This folder belongs to someone else. It is read-only.';
		}
		return folder.settings === null ? this.planManager.customSettingsBlocker(folder.id) : null;
	});

	/** The resource limits, and what they are counted with, can also be fixed by a folder. */
	public readonly resourcesBlocker: Signal<string | null> = computed(() => {
		const blocker = this.blocker();
		const plan = this.target()?.plan ?? null;
		if (blocker !== null || plan === null) {
			return blocker;
		}
		const fixed = this.planManager.fixedFolderOf(plan);
		return fixed !== null && fixed.fixedGroups.includes('resources')
			? `The resource limits of this plan are set by the folder "${fixed.name}".`
			: null;
	});

	public constructor(
		private readonly targets: MapTargetSource,
		private readonly planManager: PlanManager,
	)
	{
	}

	public update(change: (settings: PlanSettings) => PlanSettings, resources: boolean): boolean
	{
		const target = this.target();
		if (target === null || (resources ? this.resourcesBlocker() : this.blocker()) !== null) {
			return false;
		}
		if (target.plan !== null) {
			const plan = target.plan;
			const updated = change(plan.settings);
			this.planManager.setSettings(plan.id, updated);
			// The planner re-solves an open plan by itself; a plan changed from the map page only learns of it here.
			if (plan.graph !== null && JSON.stringify(updated.resourceLimits ?? {}) !== JSON.stringify(plan.settings.resourceLimits ?? {})) {
				this.planManager.setRecalculationNeeded([plan.id], true);
			}
			return true;
		}
		const folder = target.folder!;
		if (folder.settings === null) {
			this.planManager.enableFolderSettings(folder.id);
		}
		const settings = this.planManager.folders().find(f => f.id === folder.id)?.settings ?? null;
		if (settings === null) {
			return false;
		}
		this.planManager.setFolderSettings(folder.id, change(settings));
		return true;
	}

}
