import {Component, OnDestroy, ChangeDetectionStrategy, Signal, computed} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {Subscription} from 'rxjs';
import {FormsModule} from '@angular/forms';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faXmark} from '@fortawesome/free-solid-svg-icons';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {ItemPickerComponent} from '@src/Components/Common/ItemPickerComponent';
import {ItemPickerOption} from '@src/Components/Common/ItemPickerOption';
import {ItemForm} from '@src/Model/API/Schema/Data/Parts/ItemForm';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {MakeableItemsResolver} from '@src/Model/Planner/MakeableItemsResolver';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanInput} from '@src/Model/Planner/PlanInput';
import {PlanManager} from '@src/Model/Planner/PlanManager';

/**
 * User-supplied item sources for the solver: each row makes an item available
 * up to its amount, priced by its weight in the optimisation objective (a low
 * weight makes it a cheap alternative to mining or crafting). A new input's
 * weight follows its item's sink value (points / 10, or 1 without one) until
 * edited. Consumed inputs appear in the graph as "input" nodes.
 */
@Component({
	selector: 'calculator-input-tab',
	templateUrl: './CalculatorInputTabComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, FaIconComponent, ItemPickerComponent, InfoNoteComponent],
})
export class CalculatorInputTabComponent implements OnDestroy
{

	public readonly faXmark = faXmark;

	public rows: PlanInput[] = [];

	/** Whether the input weights optimisation goal is on - the weights only matter then. */
	public readonly weightsEnabled: Signal<boolean> = computed(() =>
		this.planManager.activeSettings()?.optimisation?.inputs ?? true);

	private loadedPlanId: string | null = null;
	/** JSON of the inputs the rows were last built from or synced to - external changes rebuild the rows. */
	private loadedInputs: string | null = null;
	private readonly subscription = new Subscription();

	public constructor(
		private readonly planManager: PlanManager,
		private readonly versionManager: VersionManager,
		private readonly makeableItems: MakeableItemsResolver,
	)
	{
		const initial = this.planManager.activePlan();
		if (initial) {
			this.loadedPlanId = initial.id;
			this.loadRows(initial);
		}

		this.subscription.add(
			toObservable(this.planManager.activePlan).subscribe(plan => {
				// Skip echoes of this tab's own sync(); anything else (plan
				// switch, context-menu removal, undo) replaces the row drafts.
				if (!plan || (plan.id === this.loadedPlanId && JSON.stringify(plan.inputs) === this.loadedInputs)) return;
				this.loadedPlanId = plan.id;
				this.loadRows(plan);
			}),
		);
	}

	/** Any item may be an input source, subject to the unmakeable-items display setting. */
	public get itemOptions(): ItemPickerOption[]
	{
		return this.makeableItems.applyToActivePlan(
			[...(this.versionManager.activeVersionData()?.items ?? [])]
				.sort((a, b) => a.name.localeCompare(b.name))
				.map(item => ({value: item.className, label: item.name, iconHash: item.icon})),
		);
	}

	/** Picking an item resets the weight to that item's default unless the user already typed their own. */
	public onItemChange(row: PlanInput, value: string): void
	{
		if (row.weight === this.defaultWeightFor(row.itemClassName)) {
			row.weight = this.defaultWeightFor(value);
		}
		row.itemClassName = value;
		this.sync();
	}

	public addRow(): void
	{
		this.rows.push({itemClassName: '', amount: 10, weight: this.defaultWeightFor('')});
		this.sync();
	}

	/** Sink points / 10 for items with a sink value; 1 otherwise (fluids cannot be sunk, zero-point items, no item yet). */
	public defaultWeightFor(itemClassName: string): number
	{
		const item = this.versionManager.activeVersionData()?.searchItemByClassName(itemClassName);
		return item && item.form === ItemForm.Solid && item.sinkPoints > 0 ? item.sinkPoints / 10 : 1;
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
			this.loadedInputs = JSON.stringify(this.rows);
			this.planManager.setInputs(plan.id, this.rows);
		}
	}

	public ngOnDestroy(): void
	{
		this.subscription.unsubscribe();
	}

	private loadRows(plan: Plan): void
	{
		this.loadedInputs = JSON.stringify(plan.inputs);
		this.rows = plan.inputs.map(input => ({...input}));
	}

}
