import {Injectable} from '@angular/core';
import {Data} from '@src/Model/Data/Data';
import {OptimisationDefaults} from '@src/Model/Planner/OptimisationDefaults';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';
import {ResourceWeightMode} from '@src/Model/Planner/ResourceWeightMode';
import {SpecialClasses} from '@src/Model/Planner/SpecialClasses';

/**
 * Turns a plan's resource weight mode into one weight per raw resource (see
 * ResourceWeightMode). Both the solver and the Resources tab go through here,
 * so what the tab shows is what the solver minimises.
 */
@Injectable({providedIn: 'root'})
export class ResourceWeightResolver
{

	/** Decimals weights are rounded to - for display and when seeding manual values. */
	public static readonly PRECISION = 4;

	/** Plans saved before modes existed: an override map means manual, otherwise map weights. */
	public modeOf(settings: PlanSettings): ResourceWeightMode
	{
		return settings.resourceWeightMode ?? (settings.resourceWeights ? 'manual' : 'map');
	}

	/**
	 * Weight of every raw resource of the version. `limits` are the per-minute
	 * caps in force (the plan's effective limits, or a folder's own) - only the
	 * limits mode reads them.
	 */
	public resolve(settings: PlanSettings, limits: Record<string, number>, data: Data): Record<string, number>
	{
		return this.resolveMode(this.modeOf(settings), settings, limits, data);
	}

	/** Weights a given mode would produce - the values a switch to manual starts from. */
	public resolveMode(mode: ResourceWeightMode, settings: PlanSettings, limits: Record<string, number>, data: Data): Record<string, number>
	{
		const weights: Record<string, number> = {};
		switch (mode) {
			case 'equal':
				data.resources.forEach(className => weights[className] = 1);
				break;
			case 'limits':
				return this.fromLimits(limits, data);
			case 'manual': {
				const map = this.fromMap(data);
				data.resources.forEach(className =>
					weights[className] = settings.resourceWeights?.[className] ?? map[className]);
				break;
			}
			default:
				return this.fromMap(data);
		}
		return weights;
	}

	public round(weight: number): number
	{
		const factor = Math.pow(10, ResourceWeightResolver.PRECISION);
		return Math.round(weight * factor) / factor;
	}

	/**
	 * Map weights: the version's world limits, with the most abundant finite
	 * resource at 1 and every other one at "most abundant / own". Water and
	 * resources the map does not cap at all are infinite and weigh next to
	 * nothing. A resource the map has none of cannot be mined, so its weight
	 * never matters and stays 1. Versions without world data fall back to the
	 * tuned defaults table.
	 */
	private fromMap(data: Data): Record<string, number>
	{
		const weights: Record<string, number> = {};
		const world = data.worldLimits;
		if (world === null) {
			data.resources.forEach(className => weights[className] = OptimisationDefaults.resourceWeights[className] ?? 1);
			return weights;
		}
		const finite = data.resources
			.filter(className => !this.isInfiniteOnMap(className, world))
			.map(className => world[className])
			.filter(limit => limit > 0);
		const largest = finite.length > 0 ? Math.max(...finite) : 0;
		data.resources.forEach(className => {
			if (this.isInfiniteOnMap(className, world)) {
				weights[className] = OptimisationDefaults.infiniteResourceWeight;
				return;
			}
			const limit = world[className];
			weights[className] = limit > 0 ? largest / limit : 1;
		});
		return weights;
	}

	/** Water needs no node and is never capped; anything the world data does not list is uncapped too. */
	private isInfiniteOnMap(className: string, world: Record<string, number>): boolean
	{
		return className === SpecialClasses.WaterItem || world[className] === undefined;
	}

	/**
	 * Limits weight: the largest set limit weighs 1 and every other limited
	 * resource largest / own limit. Unlimited resources weigh next to nothing,
	 * like infinite ones on the map; a limit of 0 forbids mining, so its
	 * weight never matters and stays 1.
	 */
	private fromLimits(limits: Record<string, number>, data: Data): Record<string, number>
	{
		const finite = data.resources.map(className => limits[className]).filter(limit => limit !== undefined && limit > 0);
		const largest = finite.length > 0 ? Math.max(...finite) : 0;
		const weights: Record<string, number> = {};
		data.resources.forEach(className => {
			const limit = limits[className];
			if (limit === undefined) {
				weights[className] = OptimisationDefaults.infiniteResourceWeight;
			} else {
				weights[className] = limit > 0 ? largest / limit : 1;
			}
		});
		return weights;
	}

}
