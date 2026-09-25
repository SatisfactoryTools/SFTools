import {Injectable} from '@angular/core';
import {Version} from '@src/Model/API/Schema/Version';
import {Building} from '@src/Model/Data/Entities/Building';
import {Data} from '@src/Model/Data/Data';
import {AlienPowerAugmenters} from '@src/Model/Planner/AlienPowerAugmenters';
import {ExtraPower} from '@src/Model/Planner/ExtraPower';
import {GeothermalGenerators} from '@src/Model/Planner/GeothermalGenerators';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';
import {SpecialClasses} from '@src/Model/Planner/SpecialClasses';

/**
 * Turns a plan's geothermal and augmenter settings into the ExtraPower the
 * solver and the summary panels work with, and answers whether the active
 * version has those buildings at all - a version (or mod set) without them
 * never shows the options.
 */
@Injectable({providedIn: 'root'})
export class ExtraPowerResolver
{

	public resolve(settings: PlanSettings | null | undefined): ExtraPower
	{
		if (!settings) {
			return ExtraPower.NONE;
		}
		return new ExtraPower(this.geysers(settings), this.augmenters(settings));
	}

	/** The plan's geysers, cleaned up to whole non-negative counts. */
	public geysers(settings: PlanSettings | null | undefined): GeothermalGenerators
	{
		const geysers = settings?.geothermalGenerators;
		return {
			impure: this.count(geysers?.impure),
			normal: this.count(geysers?.normal),
			pure: this.count(geysers?.pure),
		};
	}

	/** The plan's augmenters, cleaned up - more boosted than built is capped at built. */
	public augmenters(settings: PlanSettings | null | undefined): AlienPowerAugmenters
	{
		const count = this.count(settings?.alienPowerAugmenters?.count);
		return {count, boosted: Math.min(count, this.count(settings?.alienPowerAugmenters?.boosted))};
	}

	/** The Geothermal Generator of the active version, if it has one. */
	public geothermalBuilding(data: Data | null | undefined): Building | null
	{
		return data?.searchBuildingByClassName(SpecialClasses.GeothermalGeneratorBuilding) ?? null;
	}

	/** The Alien Power Augmenter of the active version, if it has one. */
	public augmenterBuilding(data: Data | null | undefined): Building | null
	{
		return data?.searchBuildingByClassName(SpecialClasses.AlienPowerAugmenterBuilding) ?? null;
	}

	/**
	 * How many geysers of each purity the version's map holds, or null when
	 * the version carries no world data - then the counts stay uncapped.
	 */
	public availableGeysers(version: Version | null | undefined): GeothermalGenerators | null
	{
		const geysers = version?.worldData?.nodes?.geysers;
		return geysers ? {impure: geysers.impure, normal: geysers.normal, pure: geysers.pure} : null;
	}

	private count(value: number | undefined): number
	{
		return value !== undefined && isFinite(value) ? Math.max(0, Math.round(value)) : 0;
	}

}
