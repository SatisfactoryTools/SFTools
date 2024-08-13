import {Component, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Item} from '@src/Model/Data/Entities/Item';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {ProductionRequest} from '@src/Model/Planner/ProductionRequest';
import {VersionManager} from '@src/Model/Data/VersionManager';

@Component({
	selector: 'planner-production-target',
	templateUrl: './ProductionTargetComponent.html',
	imports: [FormsModule],
})
export class ProductionTargetComponent implements OnInit
{

	public rows: ProductionRequest[] = [];

	public constructor(
		public readonly planManager: PlanManager,
		private readonly versionManager: VersionManager,
	)
	{
	}

	public get availableItems(): Item[]
	{
		return [...(this.versionManager.activeVersionData()?.items ?? [])].sort((a, b) => a.name.localeCompare(b.name));
	}

	public ngOnInit(): void
	{
		const plan = this.planManager.activePlan();
		if (plan) {
			this.rows = plan.requests.map(r => ({...r}));
		}
	}

	public addRow(): void
	{
		this.rows.push({itemClassName: '', ratePerMinute: 1});
		this.sync();
	}

	public removeRow(index: number): void
	{
		this.rows.splice(index, 1);
		this.sync();
	}

	public sync(): void
	{
		const plan = this.planManager.activePlan();
		if (plan) {
			this.planManager.setRequests(plan.id, this.rows);
		}
	}

}
