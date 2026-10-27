import {computed, Injectable, Signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Params, Router} from '@angular/router';
import {map} from 'rxjs/operators';
import {MapTargetSource} from '@src/Components/Map/MapTargetSource';
import {MapTarget} from '@src/Model/Map/MapTarget';
import {PlanManager} from '@src/Model/Planner/PlanManager';

@Injectable()
export class PageMapTargetSource extends MapTargetSource
{

	public static readonly PLAN_PARAM = 'plan';
	public static readonly FOLDER_PARAM = 'folder';

	public readonly selectable = true;

	private readonly planId: Signal<string | null>;
	private readonly folderId: Signal<string | null>;

	public readonly target: Signal<MapTarget | null> = computed(() => {
		const planId = this.planId();
		if (planId !== null) {
			const plan = this.planManager.findPlan(planId);
			return plan === null ? null : MapTarget.ofPlan(plan);
		}
		const folderId = this.folderId();
		if (folderId !== null) {
			const folder = this.planManager.folders().find(f => f.id === folderId)
				?? this.planManager.sharedFolders().find(f => f.id === folderId);
			return folder === undefined ? null : MapTarget.ofFolder(folder);
		}
		return null;
	});

	private readonly requested = computed(() => this.planId() !== null || this.folderId() !== null);

	public readonly loading: Signal<boolean> = computed(() =>
		this.requested() && this.target() === null && !this.planManager.loadedForActiveVersion());

	/** The link names a plan or folder these plans do not have: someone else's, or deleted since. */
	public readonly missing: Signal<boolean> = computed(() =>
		this.requested() && this.target() === null && this.planManager.loadedForActiveVersion());

	public constructor(
		private readonly planManager: PlanManager,
		private readonly router: Router,
		private readonly route: ActivatedRoute,
	)
	{
		super();
		this.planId = toSignal(route.queryParamMap.pipe(map(query => query.get(PageMapTargetSource.PLAN_PARAM))), {
			initialValue: route.snapshot.queryParamMap.get(PageMapTargetSource.PLAN_PARAM),
		});
		this.folderId = toSignal(route.queryParamMap.pipe(map(query => query.get(PageMapTargetSource.FOLDER_PARAM))), {
			initialValue: route.snapshot.queryParamMap.get(PageMapTargetSource.FOLDER_PARAM),
		});
	}

	public static queryParams(target: MapTarget | null): Params
	{
		return {
			[PageMapTargetSource.PLAN_PARAM]: target?.plan?.id ?? null,
			[PageMapTargetSource.FOLDER_PARAM]: target?.folder?.id ?? null,
		};
	}

	public select(target: MapTarget | null): void
	{
		void this.router.navigate([], {
			relativeTo: this.route,
			queryParams: PageMapTargetSource.queryParams(target),
			queryParamsHandling: 'merge',
		});
	}

}
