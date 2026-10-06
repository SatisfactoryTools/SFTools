import {Component, OnDestroy, ChangeDetectionStrategy} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {Subscription} from 'rxjs';
import {FormsModule} from '@angular/forms';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faXmark} from '@fortawesome/free-solid-svg-icons';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {ItemPickerComponent} from '@src/Components/Common/ItemPickerComponent';
import {ItemPickerOption} from '@src/Components/Common/ItemPickerOption';
import {Item} from '@src/Model/Data/Entities/Item';
import {MakeableItemsResolver} from '@src/Model/Planner/MakeableItemsResolver';
import {MaximiseCategory} from '@src/Model/Planner/Solver/Request/MaximiseCategory';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PowerUnit} from '@src/Model/Planner/PowerUnit';
import {ProductionRequest} from '@src/Model/Planner/ProductionRequest';
import {ProductionRequestMode} from '@src/Model/Planner/ProductionRequestMode';
import {RateFormatter} from '@src/Model/RateFormatter';
import {SpecialClasses} from '@src/Model/Planner/SpecialClasses';
import {VersionManager} from '@src/Model/Data/VersionManager';

@Component({
	selector: 'calculator-production-tab',
	templateUrl: './CalculatorProductionTabComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, FaIconComponent, ItemPickerComponent, InfoNoteComponent],
})
export class CalculatorProductionTabComponent implements OnDestroy
{

	public readonly faXmark = faXmark;
	public readonly powerTargetClass = SpecialClasses.PowerTarget;
	public readonly sinkPointsTargetClass = SpecialClasses.SinkPointsTarget;

	public rows: ProductionRequest[] = [];

	private loadedPlanId: string | null = null;
	private loadedRequests: string | null = null;
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
				// Skip echoes of this tab's own sync(); anything else replaces the row drafts.
				if (!plan || (plan.id === this.loadedPlanId && JSON.stringify(plan.requests) === this.loadedRequests)) return;
				this.loadedPlanId = plan.id;
				this.loadRows(plan);
			}),
		);
	}

	private loadRows(plan: Plan): void
	{
		this.loadedRequests = JSON.stringify(plan.requests);
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
		if (value !== this.powerTargetClass) {
			row.powerUnit = undefined;
		}
		this.sync();
		this.autoFillNameAndIcon();
	}

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

	public modeOf(row: ProductionRequest): ProductionRequestMode
	{
		return row.mode ?? 'rate';
	}

	/** Omitting the default keeps requests saved before maximise existed byte-identical. */
	public setMode(row: ProductionRequest, mode: ProductionRequestMode): void
	{
		row.mode = mode === 'rate' ? undefined : mode;
		this.sync();
	}

	public powerRateOf(row: ProductionRequest): number | null
	{
		// null passes through so a cleared input stays empty mid-edit.
		return row.ratePerMinute == null ? null : row.ratePerMinute / this.powerScale(row.powerUnit);
	}

	public setPowerRate(row: ProductionRequest, value: number | null): void
	{
		// Rounding kills float artifacts like 0.1 GW -> 100.00000000000001 MW.
		row.ratePerMinute = (value == null ? value : Math.round(value * this.powerScale(row.powerUnit) * 1e6) / 1e6) as number;
		this.sync();
	}

	public powerSelectionOf(row: ProductionRequest): string
	{
		return this.modeOf(row) === 'maximise' ? 'maximise' : row.powerUnit ?? 'MW';
	}

	public setPowerSelection(row: ProductionRequest, selection: string): void
	{
		if (selection === 'maximise') {
			this.setMode(row, 'maximise');
			return;
		}
		row.mode = undefined;
		// Omitting the MW default keeps requests saved before units existed byte-identical.
		row.powerUnit = selection === 'MW' ? undefined : selection as PowerUnit;
		this.sync();
	}

	private powerScale(unit: PowerUnit | undefined): number
	{
		switch (unit) {
			case 'GW': return 1000;
			case 'TW': return 1000000;
			default: return 1;
		}
	}

	public maximiseDisabled(row: ProductionRequest): boolean
	{
		const active = this.maximisedCategory();
		return active !== null && active !== this.categoryOf(row.itemClassName) && this.modeOf(row) !== 'maximise';
	}

	public achievedFor(row: ProductionRequest): string | null
	{
		const achieved = this.planManager.activePlan()?.metadata?.achievedMaximums?.[row.itemClassName];
		if (achieved === undefined) {
			return null;
		}
		if (row.itemClassName === this.powerTargetClass) {
			return this.rateFormatter.power(achieved);
		}
		if (row.itemClassName === this.sinkPointsTargetClass) {
			return `${this.rateFormatter.amount(achieved)} points/min`;
		}
		const item = this.versionManager.activeVersionData()?.searchItemByClassName(row.itemClassName) ?? null;
		return this.rateFormatter.rate(achieved, item);
	}

	public get showSloopWarning(): boolean
	{
		return this.rows.some(row => this.modeOf(row) === 'maximise')
			&& (this.planManager.activeSettings()?.maxSloops ?? 0) > 0;
	}

	private maximisedCategory(): MaximiseCategory | null
	{
		const row = this.rows.find(r => this.modeOf(r) === 'maximise' && r.itemClassName !== '');
		return row === undefined ? null : this.categoryOf(row.itemClassName);
	}

	private categoryOf(itemClassName: string): MaximiseCategory
	{
		if (itemClassName === this.powerTargetClass) {
			return 'power';
		}
		if (itemClassName === this.sinkPointsTargetClass) {
			return 'sinkPoints';
		}
		return 'items';
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
			this.loadedRequests = JSON.stringify(this.rows);
			this.planManager.setRequests(plan.id, this.rows);
		}
	}

	public ngOnDestroy(): void
	{
		this.subscription.unsubscribe();
	}

}
