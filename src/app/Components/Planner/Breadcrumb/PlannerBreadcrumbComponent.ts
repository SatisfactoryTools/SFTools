import {Component, ChangeDetectionStrategy, computed} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faArrowLeft, faChevronRight} from '@fortawesome/free-solid-svg-icons';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanNameResolver} from '@src/Model/Planner/PlanNameResolver';

/** Shown over the canvas while a subplan is open: the plans above it, each one click away. */
@Component({
	selector: 'planner-breadcrumb',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, AppTooltipDirective],
	template: `
		@if (trail().length > 1) {
			<nav class="crumbs" aria-label="Subplan path">
				<button
					class="btn btn-sm btn-outline-secondary py-0 px-1 me-1"
					type="button"
					tooltip="Back to the parent plan" container="body" placement="bottom"
					(click)="open(trail()[trail().length - 2])"
				><fa-icon [icon]="faArrowLeft" [fixedWidth]="true"></fa-icon><span class="visually-hidden">Back to the parent plan</span></button>
				@for (plan of trail(); track plan.id; let last = $last) {
					@if (last) {
						<span class="crumb current text-truncate" aria-current="page">{{ names.displayName(plan) }}</span>
					} @else {
						<button class="crumb crumb-link text-truncate" type="button" (click)="open(plan)">{{ names.displayName(plan) }}</button>
						<fa-icon [icon]="faChevronRight" class="sep"></fa-icon>
					}
				}
			</nav>
		}
	`,
	styles: `
		:host {
			display: block;
		}
		.crumbs {
			display: flex;
			align-items: center;
			gap: 0.35rem;
			max-width: 100%;
			padding: 0.25rem 0.5rem;
			background: rgba(var(--bs-dark-rgb), 0.85);
			border: 1px solid var(--bs-border-color);
			font-size: 0.85rem;
		}
		.crumb {
			min-width: 0;
			max-width: 14rem;
		}
		.crumb-link {
			padding: 0;
			border: 0;
			background: none;
			color: var(--bs-link-color);
		}
		.crumb-link:hover {
			text-decoration: underline;
		}
		.current {
			font-weight: 600;
		}
		.sep {
			font-size: 0.65rem;
			opacity: 0.6;
		}
	`,
})
export class PlannerBreadcrumbComponent
{

	public readonly faArrowLeft = faArrowLeft;
	public readonly faChevronRight = faChevronRight;

	/** Top-level plan first, the open plan last. */
	public readonly trail = computed<Plan[]>(() => {
		const plan = this.planManager.activePlan();
		const trail: Plan[] = [];
		const seen = new Set<string>();
		let current: Plan | null = plan;
		while (current !== null && !seen.has(current.id)) {
			seen.add(current.id);
			trail.unshift(current);
			current = current.parentPlanId === null ? null : this.planManager.findPlan(current.parentPlanId);
		}
		return trail;
	});

	public constructor(
		private readonly planManager: PlanManager,
		public readonly names: PlanNameResolver,
	)
	{
	}

	public open(plan: Plan): void
	{
		this.planManager.setActivePlan(plan.id);
	}

}
