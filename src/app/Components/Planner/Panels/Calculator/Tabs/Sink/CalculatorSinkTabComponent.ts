import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {ItemForm} from '@src/Model/API/Schema/Data/Parts/ItemForm';
import {Item} from '@src/Model/Data/Entities/Item';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {RateFormatter} from '@src/Model/RateFormatter';

/**
 * Sinkable-item selection for the solver: checked items may be fed into the
 * AWESOME Sink to earn sink points (nothing is sinkable by default). Only
 * solid items worth points qualify - fluids and zero-point items (nuclear
 * waste) cannot be sinked.
 */
@Component({
	selector: 'calculator-sink-tab',
	templateUrl: './CalculatorSinkTabComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, GameIconComponent],
})
export class CalculatorSinkTabComponent
{

	public filter = '';
	public sortBy: 'name' | 'points' = 'name';

	public constructor(
		private readonly planManager: PlanManager,
		private readonly versionManager: VersionManager,
		public readonly rateFormatter: RateFormatter,
	)
	{
	}

	/** Sinkable items matching the filter, in the selected order. */
	public get items(): Item[]
	{
		const query = this.filter.trim().toLowerCase();
		const items = this.sinkableItems()
			.filter(item => query === '' || item.name.toLowerCase().includes(query));
		return this.sortBy === 'points'
			? items.sort((a, b) => b.sinkPoints - a.sinkPoints || a.name.localeCompare(b.name))
			: items.sort((a, b) => a.name.localeCompare(b.name));
	}

	public setSortBy(sortBy: 'name' | 'points'): void
	{
		this.sortBy = sortBy;
	}

	public isEnabled(item: Item): boolean
	{
		return this.enabledSet().has(item.className);
	}

	public toggle(item: Item): void
	{
		const enabled = this.enabledSet();
		enabled.has(item.className) ? enabled.delete(item.className) : enabled.add(item.className);
		this.persist(enabled);
	}

	/** All/None act on the currently filtered (visible) list. */
	public setAll(items: Item[], value: boolean): void
	{
		const enabled = this.enabledSet();
		items.forEach(item => value ? enabled.add(item.className) : enabled.delete(item.className));
		this.persist(enabled);
	}

	private sinkableItems(): Item[]
	{
		return (this.versionManager.activeVersionData()?.items ?? [])
			.filter(item => item.form === ItemForm.Solid && item.sinkPoints > 0);
	}

	private enabledSet(): Set<string>
	{
		return new Set(this.planManager.activeSettings()?.sinkableItems ?? []);
	}

	private persist(enabled: Set<string>): void
	{
		const settings = this.planManager.activeSettings();
		if (!settings) return;
		this.planManager.updateActiveSettings({
			...settings,
			sinkableItems: enabled.size > 0 ? [...enabled].sort() : undefined,
		});
	}

}
