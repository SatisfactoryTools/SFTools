import {Component, OnDestroy, ChangeDetectionStrategy} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {Subscription} from 'rxjs';
import {FormsModule} from '@angular/forms';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faXmark} from '@fortawesome/free-solid-svg-icons';
import {ItemPickerComponent} from '@src/Components/Common/ItemPickerComponent';
import {ItemPickerOption} from '@src/Components/Common/ItemPickerOption';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanInput} from '@src/Model/Planner/PlanInput';
import {PlanManager} from '@src/Model/Planner/PlanManager';

/** Weight of a freshly added input - low, so inputs are cheap sources by default. */
const DEFAULT_WEIGHT = 0.001;

/**
 * User-supplied item sources for the solver: each row makes an item available
 * up to its amount, priced by its weight in the optimisation objective (a low
 * weight makes it a cheap alternative to mining or crafting). Consumed inputs
 * appear in the graph as "input" nodes.
 */
@Component({
	selector: 'calculator-input-tab',
	templateUrl: './CalculatorInputTabComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, FaIconComponent, ItemPickerComponent],
})
export class CalculatorInputTabComponent implements OnDestroy
{

	public readonly faXmark = faXmark;

	public rows: PlanInput[] = [];

	private loadedPlanId: string | null = null;
	private readonly subscription = new Subscription();

	public constructor(
		private readonly planManager: PlanManager,
		private readonly versionManager: VersionManager,
	)
	{
		const initial = this.planManager.activePlan();
		if (initial) {
			this.loadedPlanId = initial.id;
			this.loadRows(initial);
		}

		this.subscription.add(
			toObservable(this.planManager.activePlan).subscribe(plan => {
				if (!plan || plan.id === this.loadedPlanId) return;
				this.loadedPlanId = plan.id;
				this.loadRows(plan);
			}),
		);
	}

	/** Any item may be an input source. */
	public get itemOptions(): ItemPickerOption[]
	{
		return [...(this.versionManager.activeVersionData()?.items ?? [])]
			.sort((a, b) => a.name.localeCompare(b.name))
			.map(item => ({value: item.className, label: item.name, iconHash: item.icon}));
	}

	public onItemChange(row: PlanInput, value: string): void
	{
		row.itemClassName = value;
		this.sync();
	}

	public addRow(): void
	{
		this.rows.push({itemClassName: '', amount: 10, weight: DEFAULT_WEIGHT});
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
			this.planManager.setInputs(plan.id, this.rows);
		}
	}

	public ngOnDestroy(): void
	{
		this.subscription.unsubscribe();
	}

	private loadRows(plan: Plan): void
	{
		this.rows = plan.inputs.map(input => ({...input}));
	}

}
