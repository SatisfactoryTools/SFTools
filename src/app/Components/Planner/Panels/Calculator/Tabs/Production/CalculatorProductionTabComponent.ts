import {Component, OnDestroy, ChangeDetectionStrategy} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {Subscription} from 'rxjs';
import {FormsModule} from '@angular/forms';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faXmark} from '@fortawesome/free-solid-svg-icons';
import {ItemPickerComponent} from '@src/Components/Common/ItemPickerComponent';
import {ItemPickerOption} from '@src/Components/Common/ItemPickerOption';
import {Item} from '@src/Model/Data/Entities/Item';
import {MakeableItemsResolver} from '@src/Model/Planner/MakeableItemsResolver';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {ProductionRequest} from '@src/Model/Planner/ProductionRequest';
import {RateFormatter} from '@src/Model/RateFormatter';
import {SpecialClasses} from '@src/Model/Planner/SpecialClasses';
import {VersionManager} from '@src/Model/Data/VersionManager';

@Component({
	selector: 'calculator-production-tab',
	templateUrl: './CalculatorProductionTabComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, FaIconComponent, ItemPickerComponent],
})
export class CalculatorProductionTabComponent implements OnDestroy
{

	public readonly faXmark = faXmark;
	public readonly powerTargetClass = SpecialClasses.PowerTarget;
	public readonly sinkPointsTargetClass = SpecialClasses.SinkPointsTarget;

	public rows: ProductionRequest[] = [];

	private loadedPlanId: string | null = null;
	private readonly subscription = new Subscription();

	public constructor(
		public readonly planManager: PlanManager,
		private readonly versionManager: VersionManager,
		private readonly rateFormatter: RateFormatter,
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
				if (!plan || plan.id === this.loadedPlanId) return;
				this.loadedPlanId = plan.id;
				this.loadRows(plan);
			}),
		);
	}

	/** Show the plan's requests, or a single blank row so there's always one ready to fill. */
	private loadRows(plan: Plan): void
	{
		this.rows = plan.requests.length > 0
			? plan.requests.map(r => ({...r}))
			: [this.blankRow()];
	}

	private blankRow(): ProductionRequest
	{
		return {itemClassName: '', ratePerMinute: 10};
	}

	public get availableItems(): Item[]
	{
		return [...(this.versionManager.activeVersionData()?.getAutomatableItems() ?? [])].sort((a, b) => a.name.localeCompare(b.name));
	}

	/**
	 * Picker choices: the two special targets first (never filtered), then
	 * every automatable item, struck through or hidden per the unmakeable-items
	 * display setting.
	 */
	public get itemOptions(): ItemPickerOption[]
	{
		const data = this.versionManager.activeVersionData();
		return [
			{value: this.powerTargetClass, label: 'Power (generators)', iconHash: null},
			{
				value: this.sinkPointsTargetClass,
				label: 'Sink points (AWESOME Sink)',
				iconHash: data?.iconForClassName(SpecialClasses.SinkCouponItem) ?? null,
			},
			...this.makeableItems.applyToActivePlan(
				this.availableItems.map(item => ({value: item.className, label: item.name, iconHash: item.icon})),
			),
		];
	}

	public onItemChange(row: ProductionRequest, value: string): void
	{
		row.itemClassName = value;
		this.sync();
		this.autoFillNameAndIcon();
	}

	/**
	 * The first time a real item is added to a still-unnamed plan, save its name
	 * as "[Item] factory" and (if the icon was never chosen) its icon to match.
	 * Runs off the first requested item; a plan named or "none"-iconed by the
	 * user is left untouched.
	 */
	private autoFillNameAndIcon(): void
	{
		const plan = this.planManager.activePlan();
		const data = this.versionManager.activeVersionData();
		if (!plan || !data) {
			return;
		}
		const firstItem = this.rows
			.map(r => data.searchItemByClassName(r.itemClassName))
			.find((item): item is Item => item !== undefined);
		if (!firstItem) {
			return;
		}
		if (plan.name.trim() === '') {
			this.planManager.renamePlan(plan.id, `${firstItem.name} factory`);
		}
		if (plan.iconClassName === undefined) {
			this.planManager.setPlanIcon(plan.id, firstItem.className);
		}
	}

	public rateUnit(itemClassName: string): string
	{
		if (itemClassName === this.powerTargetClass) {
			return 'MW';
		}
		if (itemClassName === this.sinkPointsTargetClass) {
			return 'points/min';
		}
		const item = itemClassName
			? this.versionManager.activeVersionData()?.searchItemByClassName(itemClassName) ?? null
			: null;
		return this.rateFormatter.unit(item);
	}

	public addRow(): void
	{
		this.rows.push(this.blankRow());
		this.sync();
	}

	public removeRow(index: number): void
	{
		this.rows.splice(index, 1);
		// Always keep one blank row ready, so "Add Item" stays optional.
		if (this.rows.length === 0) {
			this.rows.push(this.blankRow());
		}
		this.sync();
	}

	public sync(): void
	{
		const plan = this.planManager.activePlan();
		if (plan) {
			this.planManager.setRequests(plan.id, this.rows);
		}
	}

	public ngOnDestroy(): void
	{
		this.subscription.unsubscribe();
	}

}
