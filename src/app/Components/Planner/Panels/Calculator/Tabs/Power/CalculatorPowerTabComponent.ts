import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronRight} from '@fortawesome/free-solid-svg-icons';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {CollapsedSectionsService} from '@src/Components/Common/CollapsedSectionsService';
import {CollapsibleSections} from '@src/Components/Common/CollapsibleSections';
import {CollapsibleCardComponent} from '@src/Components/Common/CollapsibleCardComponent';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {PowerDrawComponent} from '@src/Components/Common/PowerDrawComponent';
import {Building} from '@src/Model/Data/Entities/Building';
import {Item} from '@src/Model/Data/Entities/Item';
import {Fuel} from '@src/Model/Data/Entities/Parts/Fuel';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {ExtraPower} from '@src/Model/Planner/ExtraPower';
import {ExtraPowerResolver} from '@src/Model/Planner/ExtraPowerResolver';
import {GeothermalGenerators} from '@src/Model/Planner/GeothermalGenerators';
import {GeyserPurity} from '@src/Components/Planner/Panels/Calculator/Tabs/Power/GeyserPurity';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PowerDraw} from '@src/Model/Planner/PowerDraw';
import {RateFormatter} from '@src/Model/RateFormatter';
import {SpecialClasses} from '@src/Model/Planner/SpecialClasses';

/**
 * Everything the plan may make power with. Enabling a fuel enables its
 * generator; every enabled fuel becomes a burnable option in the solve
 * (fuel + supplemental fluid in, power + burn byproduct out).
 *
 * Geothermal generators and alien power augmenters work differently: the
 * solver never places them, the user says how many the plan builds and the
 * solve takes their power as given. Both cards only show when the active
 * version actually has the building.
 */
@Component({
	selector: 'calculator-power-tab',
	templateUrl: './CalculatorPowerTabComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [CollapsibleCardComponent, FaIconComponent, GameIconComponent, InfoNoteComponent, PowerDrawComponent],
})
export class CalculatorPowerTabComponent
{

	public readonly faChevronRight = faChevronRight;

	/** No geysers - the starting point for both the "per one augmenter" figures and a cleared card. */
	private static readonly NO_GEYSERS: GeothermalGenerators = {impure: 0, normal: 0, pure: 0};

	/** What a single augmenter does, so the card's text follows the model instead of repeating it. */
	private static readonly ONE_AUGMENTER = new ExtraPower(CalculatorPowerTabComponent.NO_GEYSERS, {count: 1, boosted: 0});
	private static readonly ONE_BOOSTED = new ExtraPower(CalculatorPowerTabComponent.NO_GEYSERS, {count: 1, boosted: 1});

	private static readonly PURITY_LABELS: {key: keyof GeothermalGenerators; label: string}[] = [
		{key: 'impure', label: 'Impure geysers'},
		{key: 'normal', label: 'Normal geysers'},
		{key: 'pure', label: 'Pure geysers'},
	];

	/** Which cards are folded; shared, so a fold survives leaving the tab. */
	public readonly foldState: CollapsibleSections;

	public constructor(
		private readonly planManager: PlanManager,
		private readonly versionManager: VersionManager,
		private readonly extraPower: ExtraPowerResolver,
		public readonly rateFormatter: RateFormatter,
		collapsedSections: CollapsedSectionsService,
	)
	{
		this.foldState = new CollapsibleSections(collapsedSections, 'power');
	}

	/** The fold key of one generator's card. */
	public sectionOf(generator: Building): string
	{
		return 'generator:' + generator.className;
	}

	/** Fuels switched on for this generator - the folded card says so instead of showing them. */
	public enabledFuelCount(generator: Building): number
	{
		return (this.enabledFuels()[generator.className] ?? []).length;
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

	// ── Geothermal generators ─────────────────────────────────────────────

	/** The version's geothermal generator, or null when it has none - then the card stays hidden. */
	public get geothermalBuilding(): Building | null
	{
		return this.extraPower.geothermalBuilding(this.versionManager.activeVersionData());
	}

	public get geyserRows(): GeyserPurity[]
	{
		const geysers = this.extraPower.geysers(this.planManager.activeSettings());
		const available = this.availableGeysers;
		return CalculatorPowerTabComponent.PURITY_LABELS.map(purity => ({
			key: purity.key,
			label: purity.label,
			count: geysers[purity.key],
			available: available === null ? null : available[purity.key],
			power: this.geothermalPowerOf(purity.key, 1),
		}));
	}

	/** Whether the map's geyser counts are known - they cap the inputs and enable "All". */
	public get hasGeyserCaps(): boolean
	{
		return this.availableGeysers !== null;
	}

	public get geothermalPower(): PowerDraw
	{
		return this.currentExtraPower.geothermalPower;
	}

	public setGeyserCount(key: keyof GeothermalGenerators, value: number): void
	{
		const geysers = this.extraPower.geysers(this.planManager.activeSettings());
		const available = this.availableGeysers;
		const count = isFinite(value) ? Math.max(0, Math.round(value)) : 0;
		this.persistGeysers({
			...geysers,
			[key]: available === null ? count : Math.min(count, available[key]),
		});
	}

	/** Every geyser the map has goes to power - only offered when the counts are known. */
	public useAllGeysers(): void
	{
		const available = this.availableGeysers;
		if (available !== null) {
			this.persistGeysers(available);
		}
	}

	public clearGeysers(): void
	{
		this.persistGeysers(CalculatorPowerTabComponent.NO_GEYSERS);
	}

	// ── Alien power augmenters ────────────────────────────────────────────

	/** The version's alien power augmenter, or null when it has none - then the card stays hidden. */
	public get augmenterBuilding(): Building | null
	{
		return this.extraPower.augmenterBuilding(this.versionManager.activeVersionData());
	}

	public get augmenterCount(): number
	{
		return this.extraPower.augmenters(this.planManager.activeSettings()).count;
	}

	public get boostedCount(): number
	{
		return this.extraPower.augmenters(this.planManager.activeSettings()).boosted;
	}

	public setAugmenterCount(value: number): void
	{
		const count = this.wholeCount(value);
		this.persistAugmenters({count, boosted: Math.min(count, this.boostedCount)});
	}

	public setBoostedCount(value: number): void
	{
		const count = this.augmenterCount;
		this.persistAugmenters({count, boosted: Math.min(count, this.wholeCount(value))});
	}

	/** What one augmenter adds on its own, for the card's explanation. */
	public get flatPerAugmenterText(): string
	{
		return this.rateFormatter.power(CalculatorPowerTabComponent.ONE_AUGMENTER.flatBonus);
	}

	public get sharePerAugmenterText(): string
	{
		return this.rateFormatter.percent(CalculatorPowerTabComponent.ONE_AUGMENTER.multiplier - 1);
	}

	public get sharePerBoostedText(): string
	{
		return this.rateFormatter.percent(CalculatorPowerTabComponent.ONE_BOOSTED.multiplier - 1);
	}

	public get sloopsPerAugmenter(): number
	{
		return CalculatorPowerTabComponent.ONE_AUGMENTER.sloopCost;
	}

	public get matrixPerBoostedText(): string
	{
		return this.rateFormatter.rate(CalculatorPowerTabComponent.ONE_BOOSTED.matrixDemand, this.matrixItem);
	}

	/** What a boosted augmenter burns, named for the card's text. */
	public get matrixName(): string
	{
		return this.matrixItem?.name ?? 'Alien Power Matrix';
	}

	/** Alien Power Matrix, when the version has it - the card shows its icon. */
	public get matrixItem(): Item | null
	{
		return this.versionManager.activeVersionData()?.searchItemByClassName(SpecialClasses.AlienPowerMatrixItem) ?? null;
	}

	public get totalFlatText(): string
	{
		return this.rateFormatter.power(this.currentExtraPower.flatBonus);
	}

	public get totalShareText(): string
	{
		return this.rateFormatter.percent(this.currentExtraPower.multiplier - 1);
	}

	public get matrixDemandText(): string
	{
		return this.rateFormatter.rate(this.currentExtraPower.matrixDemand, this.matrixItem);
	}

	/** Somersloops the augmenters take out of the plan's budget. */
	public get sloopCost(): number
	{
		return this.currentExtraPower.sloopCost;
	}

	/** The augmenters cost more somersloops than the plan has - the solve would refuse. */
	public get sloopsOverBudget(): boolean
	{
		return this.sloopCost > this.maxSloops;
	}

	private get currentExtraPower(): ExtraPower
	{
		return this.extraPower.resolve(this.planManager.activeSettings());
	}

	private get availableGeysers(): GeothermalGenerators | null
	{
		return this.extraPower.availableGeysers(this.versionManager.activeVersion());
	}

	private geothermalPowerOf(key: keyof GeothermalGenerators, count: number): PowerDraw
	{
		return new ExtraPower(
			{...CalculatorPowerTabComponent.NO_GEYSERS, [key]: count},
			{count: 0, boosted: 0},
		).geothermalPower;
	}

	private wholeCount(value: number): number
	{
		return isFinite(value) ? Math.max(0, Math.round(value)) : 0;
	}

	private persistGeysers(geysers: GeothermalGenerators): void
	{
		const settings = this.planManager.activeSettings();
		if (!settings) return;
		const used = geysers.impure + geysers.normal + geysers.pure > 0;
		this.planManager.updateActiveSettings({...settings, geothermalGenerators: used ? geysers : undefined});
	}

	private persistAugmenters(augmenters: {count: number; boosted: number}): void
	{
		const settings = this.planManager.activeSettings();
		if (!settings) return;
		this.planManager.updateActiveSettings({
			...settings,
			alienPowerAugmenters: augmenters.count > 0 ? augmenters : undefined,
		});
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
