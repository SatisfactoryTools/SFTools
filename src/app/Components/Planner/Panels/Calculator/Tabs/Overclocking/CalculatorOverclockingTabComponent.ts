import {Component, OnDestroy, ChangeDetectionStrategy, computed} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {Subscription} from 'rxjs';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faXmark} from '@fortawesome/free-solid-svg-icons';
import {ClockSpeedInputComponent} from '@src/Components/Planner/Panels/Calculator/Tabs/Overclocking/ClockSpeedInputComponent';
import {ItemPickerComponent} from '@src/Components/Common/ItemPickerComponent';
import {ItemPickerOption} from '@src/Components/Common/ItemPickerOption';
import {Formulas} from '@src/Model/Planner/Formulas';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {RecipeClockSpeed} from '@src/Model/Planner/RecipeClockSpeed';
import {VersionManager} from '@src/Model/Data/VersionManager';

/**
 * Clock speeds for the solver: a default for every machine it builds, plus
 * per-recipe overrides. Blank rows live only in the component - settings
 * carry the rows with a recipe chosen.
 */
@Component({
	selector: 'calculator-overclocking-tab',
	templateUrl: './CalculatorOverclockingTabComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [ClockSpeedInputComponent, FaIconComponent, ItemPickerComponent],
})
export class CalculatorOverclockingTabComponent implements OnDestroy
{

	public readonly faXmark = faXmark;

	public rows: RecipeClockSpeed[] = [];

	/** The plan or folder whose settings the rows were loaded from. */
	private loadedOwnerId: string | null = null;
	private readonly subscription = new Subscription();

	private readonly ownerId = computed(() =>
		this.planManager.activePlan()?.id ?? this.planManager.activeFolder()?.id ?? null);

	public constructor(
		private readonly planManager: PlanManager,
		private readonly versionManager: VersionManager,
	)
	{
		this.loadedOwnerId = this.ownerId();
		this.loadRows();

		this.subscription.add(
			toObservable(this.ownerId).subscribe(ownerId => {
				if (ownerId === this.loadedOwnerId) return;
				this.loadedOwnerId = ownerId;
				this.loadRows();
			}),
		);
	}

	/** Show the settings' overrides, or a single blank row so there's always one ready to fill. */
	private loadRows(): void
	{
		const overrides = this.planManager.activeSettings()?.recipeClockSpeeds ?? [];
		this.rows = overrides.length > 0
			? overrides.map(row => ({...row}))
			: [this.blankRow()];
	}

	private blankRow(): RecipeClockSpeed
	{
		return {recipeClassName: '', clockSpeed: 100};
	}

	public get defaultClockSpeed(): number
	{
		return this.planManager.activeSettings()?.defaultClockSpeed ?? 100;
	}

	public setDefaultClockSpeed(value: number): void
	{
		const settings = this.planManager.activeSettings();
		if (!settings || !isFinite(value)) return;
		const clock = Formulas.clampClock(value);
		this.planManager.updateActiveSettings({...settings, defaultClockSpeed: clock === 100 ? undefined : clock});
	}

	/** Picker choices: every machine recipe, iconed by its first output. */
	public get recipeOptions(): ItemPickerOption[]
	{
		const data = this.versionManager.activeVersionData();
		if (!data) return [];
		return data.getRecipesForMachines()
			.slice()
			.sort((a, b) => a.name.localeCompare(b.name))
			.map(recipe => ({
				value: recipe.className,
				label: recipe.name,
				iconHash: recipe.products[0]?.item.icon ?? null,
			}));
	}

	public onRecipeChange(row: RecipeClockSpeed, value: string): void
	{
		row.recipeClassName = value;
		this.sync();
	}

	public onClockChange(row: RecipeClockSpeed, value: number): void
	{
		row.clockSpeed = value;
		this.sync();
	}

	public addRow(): void
	{
		this.rows.push(this.blankRow());
	}

	public removeRow(index: number): void
	{
		this.rows.splice(index, 1);
		// Always keep one blank row ready, so "Add recipe" stays optional.
		if (this.rows.length === 0) {
			this.rows.push(this.blankRow());
		}
		this.sync();
	}

	public sync(): void
	{
		const settings = this.planManager.activeSettings();
		if (!settings) return;
		const overrides = this.rows
			.filter(row => row.recipeClassName !== '')
			.map(row => ({...row}));
		this.planManager.updateActiveSettings({
			...settings,
			recipeClockSpeeds: overrides.length > 0 ? overrides : undefined,
		});
	}

	public ngOnDestroy(): void
	{
		this.subscription.unsubscribe();
	}

}
