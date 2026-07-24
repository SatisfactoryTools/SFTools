import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {Item} from '@src/Model/Data/Entities/Item';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {PlanManager} from '@src/Model/Planner/PlanManager';

/**
 * Byproduct selection for the solver: checked items may be overproduced and
 * left over as byproducts (everything is allowed by default). Unchecking an
 * item removes its overproduction slack, so the solver must consume exactly
 * what it makes of it. Lists every item an automated recipe produces plus
 * the generator burn byproducts.
 */
@Component({
	selector: 'calculator-byproducts-tab',
	templateUrl: './CalculatorByproductsTabComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, GameIconComponent],
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

	/** Byproduct-capable items matching the filter, sorted by name. */
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

	/** All/None act on the currently filtered (visible) list. */
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
