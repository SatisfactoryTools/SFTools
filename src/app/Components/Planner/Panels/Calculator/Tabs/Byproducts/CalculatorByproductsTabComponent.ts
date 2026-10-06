import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {Item} from '@src/Model/Data/Entities/Item';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {PlanManager} from '@src/Model/Planner/PlanManager';

@Component({
	selector: 'calculator-byproducts-tab',
	templateUrl: './CalculatorByproductsTabComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, GameIconComponent, InfoNoteComponent],
})
export class CalculatorByproductsTabComponent
{

	public filter = '';

	public constructor(
		private readonly planManager: PlanManager,
		private readonly versionManager: VersionManager,
	)
	{
	}

	public get items(): Item[]
	{
		const query = this.filter.trim().toLowerCase();
		return (this.versionManager.activeVersionData()?.getAutomatableItems() ?? [])
			.filter(item => query === '' || item.name.toLowerCase().includes(query))
			.sort((a, b) => a.name.localeCompare(b.name));
	}

	public isEnabled(item: Item): boolean
	{
		return !this.disabledSet().has(item.className);
	}

	public toggle(item: Item): void
	{
		const disabled = this.disabledSet();
		disabled.has(item.className) ? disabled.delete(item.className) : disabled.add(item.className);
		this.persist(disabled);
	}

	public setAll(items: Item[], value: boolean): void
	{
		const disabled = this.disabledSet();
		items.forEach(item => value ? disabled.delete(item.className) : disabled.add(item.className));
		this.persist(disabled);
	}

	private disabledSet(): Set<string>
	{
		return new Set(this.planManager.activeSettings()?.disabledByproducts ?? []);
	}

	private persist(disabled: Set<string>): void
	{
		const settings = this.planManager.activeSettings();
		if (!settings) return;
		this.planManager.updateActiveSettings({
			...settings,
			disabledByproducts: disabled.size > 0 ? [...disabled].sort() : undefined,
		});
	}

}
