import {Injectable, Signal, computed, signal} from '@angular/core';
import {ShareDialogTarget} from '@src/Components/Planner/Share/ShareDialogTarget';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanNameResolver} from '@src/Model/Planner/PlanNameResolver';

/** Its own service because everything that can start a share lives somewhere else; the window itself is rendered once, by the planner. */
@Injectable({providedIn: 'root'})
export class ShareDialogService
{

	private readonly targetSignal = signal<ShareDialogTarget | null>(null);
	public readonly target: Signal<ShareDialogTarget | null> = this.targetSignal.asReadonly();

	public constructor(
		private readonly planManager: PlanManager,
		private readonly planNames: PlanNameResolver,
	)
	{
	}

	public readonly activeTarget: Signal<ShareDialogTarget | null> = computed(() => {
		const plan = this.planManager.activePlan();
		if (plan !== null) {
			if (this.planManager.isSharedPlan(plan.id)) {
				return null;
			}
			return {
				type: 'plan',
				id: plan.id,
				name: this.planNames.displayName(plan),
				device: this.planManager.isLocalPlan(plan.id),
			};
		}
		const folder = this.planManager.activeFolder();
		return folder === null ? null : {type: 'folder', id: folder.id, name: folder.name, device: false};
	});

	public openActive(): void
	{
		const target = this.activeTarget();
		if (target !== null) {
			this.open(target);
		}
	}

	public open(target: ShareDialogTarget): void
	{
		this.openLink(target);
		this.targetSignal.set(target);
	}

	/** A plan closed off by an older client would hand out a link that does not work, so sharing it opens it again. */
	private openLink(target: ShareDialogTarget): void
	{
		if (target.type === 'plan' && !target.device && this.planManager.findPlan(target.id)?.linkAccess === false) {
			this.planManager.setPlanLinkAccess(target.id, true);
		}
	}

	public close(): void
	{
		this.targetSignal.set(null);
	}

}
