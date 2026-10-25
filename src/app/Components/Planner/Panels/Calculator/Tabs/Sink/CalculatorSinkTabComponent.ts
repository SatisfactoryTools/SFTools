import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {Item} from '@src/Model/Data/Entities/Item';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {RateFormatter} from '@src/Model/RateFormatter';
import {TextMatcher} from '@src/Model/Search/TextMatcher';

@Component({
	selector: 'calculator-sink-tab',
	templateUrl: './CalculatorSinkTabComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, GameIconComponent, InfoNoteComponent],
})
export class CalculatorSinkTabComponent
{

	public filter = '';
	public sortBy: 'name' | 'points' = 'name';

	public constructor(
		private readonly planManager: PlanManager,
		private readonly versionManager: VersionManager,
		public readonly rateFormatter: RateFormatter,
		private readonly matcher: TextMatcher,
	)
	{
	}

	public get items(): Item[]
	{
		const items = this.matcher.filter(this.sinkableItems(), this.filter, item => item.name);
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

	public setAll(items: Item[], value: boolean): void
	{
		const enabled = this.enabledSet();
		items.forEach(item => value ? enabled.add(item.className) : enabled.delete(item.className));
		this.persist(enabled);
	}

	private sinkableItems(): Item[]
	{
		return (this.versionManager.activeVersionData()?.items ?? [])
			.filter(item => item.isSinkable());
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
