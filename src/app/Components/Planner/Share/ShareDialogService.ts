import {Injectable, Signal, computed, signal} from '@angular/core';
import {ShareDialogTarget} from '@src/Components/Planner/Share/ShareDialogTarget';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanNameResolver} from '@src/Model/Planner/PlanNameResolver';

/**
 * The open share window. Its own service because everything that can start a share
 * lives somewhere else: the Share button in the planner rail, the plan and folder
 * context menus, and the rows of "Plans on this device". The window itself is rendered
 * once, by the planner.
 */
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

	/**
	 * What the Share button in the planner shares: whatever is open. Null while nothing
	 * is - or while the open plan is someone else's (a share, or a plan opened by link),
	 * which has to be copied into your own plans before it can be passed on.
	 */
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

	/** Opens the window for whatever is open in the planner; does nothing when that is nothing. */
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

	/**
	 * Every plan link is open now - the window no longer offers the switch. A plan closed
	 * off by an older client would hand out a link that does not work, so sharing it opens
	 * it again.
	 */
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
