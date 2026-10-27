import {ChangeDetectionStrategy, Component, EventEmitter, Output} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faXmark} from '@fortawesome/free-solid-svg-icons';
import {MapFolderPlans} from '@src/Components/Map/MapFolderPlans';
import {PlanTreeIconComponent} from '@src/Components/Planner/Panels/Plans/PlanTreeIconComponent';
import {MapFolderPlan} from '@src/Model/Map/MapFolderPlan';

@Component({
	selector: 'map-folder-plans',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, PlanTreeIconComponent],
	template: `
		<div class="d-flex align-items-center gap-2 ps-3 pe-1 py-1 header">
			<span class="fw-semibold flex-grow-1">Plans in this folder</span>
			<button type="button" class="btn btn-link btn-sm text-reset" aria-label="Close the plans" (click)="closed.emit()">
				<fa-icon [icon]="faXmark"></fa-icon>
			</button>
		</div>
		<div class="body px-2 py-1">
			@for (plan of folderPlans.plans(); track plan.id) {
				<button
					type="button"
					class="plan d-flex align-items-center gap-2"
					[disabled]="plan.area === null && plan.spot === null"
					(click)="focus.emit(plan)"
				>
					<span class="dot" [style.background]="plan.color"></span>
					<plan-tree-icon [iconHash]="plan.iconHash" [alt]="plan.name"/>
					<span class="flex-grow-1 text-truncate">{{ plan.name }}</span>
					<span class="small text-secondary">{{ detail(plan) }}</span>
				</button>
			} @empty {
				<div class="small text-secondary px-1 py-1">The folder has no plans yet.</div>
			}
			<div class="small text-secondary px-1 pt-1 pb-1">Each plan's own resource area and factory location are drawn in its colour.</div>
		</div>
	`,
	styles: `
		:host {
			display: flex;
			flex-direction: column;
			width: 320px;
			background: var(--bs-body-bg);
			border: 1px solid #34475a;
			font-size: 0.875rem;
		}
		.header {
			flex: none;
			border-bottom: 1px solid #34475a;
		}
		.body {
			overflow-y: auto;
			overscroll-behavior: contain;
		}
		.plan {
			width: 100%;
			border: 0;
			background: none;
			color: inherit;
			text-align: left;
			padding: 3px 4px;
		}
		.plan:hover:not(:disabled) {
			background: rgba(255, 255, 255, 0.08);
		}
		.plan:disabled {
			color: inherit;
			opacity: 0.6;
		}
		.dot {
			flex: none;
			width: 10px;
			height: 10px;
			border: 1px solid #111;
			border-radius: 50%;
		}
	`,
})
export class MapFolderPlansComponent
{

	public readonly faXmark = faXmark;

	@Output() public readonly focus = new EventEmitter<MapFolderPlan>();
	@Output() public readonly closed = new EventEmitter<void>();

	public constructor(public readonly folderPlans: MapFolderPlans)
	{
	}

	public detail(plan: MapFolderPlan): string
	{
		const parts = [plan.area !== null ? 'area' : null, plan.spot !== null ? 'factory location' : null].filter(part => part !== null);
		return parts.length === 0 ? 'nothing on the map' : parts.join(' · ');
	}

}
