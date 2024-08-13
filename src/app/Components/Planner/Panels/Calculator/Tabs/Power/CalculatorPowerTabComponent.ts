import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronRight} from '@fortawesome/free-solid-svg-icons';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {Building} from '@src/Model/Data/Entities/Building';
import {Fuel} from '@src/Model/Data/Entities/Parts/Fuel';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {RateFormatter} from '@src/Model/RateFormatter';

/**
 * Generator fuel selection for the solver. Enabling any fuel enables its
 * generator; every enabled fuel becomes a burnable option in the solve
 * (fuel + supplemental fluid in, power + burn byproduct out).
 */
@Component({
	selector: 'calculator-power-tab',
	templateUrl: './CalculatorPowerTabComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, GameIconComponent],
})
export class CalculatorPowerTabComponent
{

	public readonly faChevronRight = faChevronRight;

	public constructor(
		private readonly planManager: PlanManager,
		private readonly versionManager: VersionManager,
		private readonly rateFormatter: RateFormatter,
	)
	{
	}

	public get producePowerForFactory(): boolean
	{
		return this.planManager.activeSettings()?.producePowerForFactory ?? false;
	}

	/** Somersloop budget (Sloops tab) - with factory power it makes the MIP much harder. */
	public get maxSloops(): number
	{
		return this.planManager.activeSettings()?.maxSloops ?? 0;
	}

	public get excessPowerPercent(): number
	{
		return this.planManager.activeSettings()?.excessPowerPercent ?? 10;
	}

	public toggleProducePowerForFactory(): void
	{
		const settings = this.planManager.activeSettings();
		if (!settings) return;
		this.planManager.updateActiveSettings({
			...settings,
			producePowerForFactory: this.producePowerForFactory ? undefined : true,
		});
	}

	public setExcessPowerPercent(value: number): void
	{
		const settings = this.planManager.activeSettings();
		if (!settings || !isFinite(value)) return;
		this.planManager.updateActiveSettings({...settings, excessPowerPercent: value});
	}

	public get generators(): Building[]
	{
		return (this.versionManager.activeVersionData()?.getPowerGenerators() ?? [])
			.slice()
			.sort((a, b) => a.name.localeCompare(b.name));
	}

	public powerText(generator: Building): string
	{
		return this.rateFormatter.power(generator.powerProduction);
	}

	public isEnabled(generator: Building, fuel: Fuel): boolean
	{
		return (this.enabledFuels()[generator.className] ?? []).includes(fuel.item.className);
	}

	public toggle(generator: Building, fuel: Fuel): void
	{
		const enabled = new Set(this.enabledFuels()[generator.className] ?? []);
		enabled.has(fuel.item.className) ? enabled.delete(fuel.item.className) : enabled.add(fuel.item.className);
		this.persistForGenerator(generator, enabled);
	}

	public setAll(generator: Building, value: boolean): void
	{
		this.persistForGenerator(generator, new Set(value ? generator.fuel.map(f => f.item.className) : []));
	}

	private enabledFuels(): Record<string, string[]>
	{
		return this.planManager.activeSettings()?.enabledFuels ?? {};
	}

	private persistForGenerator(generator: Building, enabled: Set<string>): void
	{
		const settings = this.planManager.activeSettings();
		if (!settings) return;

		const fuels: Record<string, string[]> = {...this.enabledFuels()};
		if (enabled.size > 0) {
			fuels[generator.className] = [...enabled].sort();
		} else {
			delete fuels[generator.className];
		}
		this.planManager.updateActiveSettings({
			...settings,
			enabledFuels: Object.keys(fuels).length > 0 ? fuels : undefined,
		});
	}

}
