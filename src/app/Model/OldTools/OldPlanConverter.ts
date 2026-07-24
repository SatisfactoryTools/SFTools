import {Injectable} from '@angular/core';
import {Data} from '@src/Model/Data/Data';
import {OldPlanConversion} from '@src/Model/OldTools/OldPlanConversion';
import {OldProductionData} from '@src/Model/OldTools/OldProductionData';
import {EnabledRecipesResolver} from '@src/Model/Planner/EnabledRecipesResolver';
import {PlanInput} from '@src/Model/Planner/PlanInput';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';
import {ProductionRequest} from '@src/Model/Planner/ProductionRequest';
import {SpecialClasses} from '@src/Model/Planner/SpecialClasses';

/** Matches the default weight new input rows get in the calculator's Input tab. */
const INPUT_WEIGHT = 0.001;

/**
 * The old tools' stock resourceMax tables (1.0 and 0.8/U8). A limit equal to
 * one of these is "never touched by the user" and is dropped so the imported
 * plan follows this app's own defaults instead.
 */
const OLD_DEFAULT_LIMITS: ReadonlyArray<Record<string, number>> = [
	{
		Desc_OreIron_C: 92100,
		Desc_OreCopper_C: 36900,
		Desc_Stone_C: 69900,
		Desc_Coal_C: 42300,
		Desc_OreGold_C: 15000,
		Desc_LiquidOil_C: 12600,
		Desc_RawQuartz_C: 13500,
		Desc_Sulfur_C: 10800,
		Desc_OreBauxite_C: 12300,
		Desc_OreUranium_C: 2100,
		Desc_NitrogenGas_C: 12000,
		Desc_SAM_C: 10200,
	},
	{
		Desc_OreIron_C: 70380,
		Desc_OreCopper_C: 28860,
		Desc_Stone_C: 52860,
		Desc_Coal_C: 30120,
		Desc_OreGold_C: 11040,
		Desc_LiquidOil_C: 11700,
		Desc_RawQuartz_C: 10500,
		Desc_Sulfur_C: 6840,
		Desc_OreBauxite_C: 9780,
		Desc_OreUranium_C: 2100,
		Desc_NitrogenGas_C: 12000,
		Desc_SAM_C: 0,
	},
];

/**
 * Converts a production line of the old Satisfactory Tools into a plan of
 * this app. Rows referencing items/recipes the active version does not know
 * (e.g. a 0.8 export opened in a 1.0 version) are skipped and reported.
 */
@Injectable({providedIn: 'root'})
export class OldPlanConverter
{

	public constructor(
		private readonly planManager: PlanManager,
		private readonly enabledRecipesResolver: EnabledRecipesResolver,
	)
	{
	}

	public convert(source: OldProductionData, data: Data): OldPlanConversion
	{
		const unknown: string[] = [];

		const requests: ProductionRequest[] = [];
		for (const row of source.request.production ?? []) {
			if (!row.item) {
				continue;
			}
			if (!data.searchItemByClassName(row.item)) {
				unknown.push(row.item);
				continue;
			}
			requests.push({
				itemClassName: row.item,
				ratePerMinute: typeof row.amount === 'number' ? row.amount : 0,
				...(row.type === 'max' ? {mode: 'maximise' as const} : {}),
			});
		}

		const inputs: PlanInput[] = [];
		for (const row of source.request.input ?? []) {
			if (!row.item) {
				continue;
			}
			if (!data.searchItemByClassName(row.item)) {
				unknown.push(row.item);
				continue;
			}
			inputs.push({itemClassName: row.item, amount: row.amount, weight: INPUT_WEIGHT});
		}

		const plan = {
			id: crypto.randomUUID(),
			name: this.resolveName(source, data, requests),
			description: '',
			folderId: null,
			parentPlanId: null,
			settings: this.convertSettings(source, data, unknown),
			requests,
			inputs,
			graph: null,
			metadata: {graphDirty: false},
			revision: null,
			iconClassName: source.metadata.icon ?? undefined,
		};

		return {plan, unknownClassNames: unknown};
	}

	/** Mirrors the old tools' derived tab names for lines never named by hand. */
	private resolveName(source: OldProductionData, data: Data, requests: ProductionRequest[]): string
	{
		const name = source.metadata.name?.trim();
		if (name) {
			return name;
		}
		for (const request of requests) {
			const item = data.searchItemByClassName(request.itemClassName);
			if (item) {
				return `${item.name} factory`;
			}
		}
		return 'Imported plan';
	}

	private convertSettings(source: OldProductionData, data: Data, unknown: string[]): PlanSettings
	{
		const settings: PlanSettings = {
			...this.planManager.defaultSettings(),
			// The old solver optimised weighted raw resources only.
			optimisation: {rawResources: true, power: false},
		};

		const enabledRecipes = this.convertRecipes(source, data, unknown);
		const disabledMachines = (source.request.blockedMachines ?? []).filter(className => data.searchBuildingByClassName(className));
		const sinkableItems = (source.request.sinkableResources ?? []).filter(className => data.searchItemByClassName(className));
		const resourceLimits = this.convertResourceLimits(source, settings.resourceLimits);

		return {
			...settings,
			...(enabledRecipes !== null ? {enabledRecipes} : {}),
			...(disabledMachines.length > 0 ? {disabledMachines} : {}),
			...(sinkableItems.length > 0 ? {sinkableItems} : {}),
			...(resourceLimits !== undefined ? {resourceLimits} : {}),
		};
	}

	/**
	 * The old tools stored recipe choices as deltas from their default (all
	 * standard on, all alternates off): blockedRecipes and
	 * allowedAlternateRecipes. Untouched defaults stay implicit here too.
	 */
	private convertRecipes(source: OldProductionData, data: Data, unknown: string[]): string[] | null
	{
		const blocked = new Set(source.request.blockedRecipes ?? []);
		const allowedAlternates = source.request.allowedAlternateRecipes ?? [];
		if (blocked.size === 0 && allowedAlternates.length === 0) {
			return null;
		}

		const enabled = new Set([...this.enabledRecipesResolver.defaultSelection(data)].filter(className => !blocked.has(className)));
		for (const className of allowedAlternates) {
			if (!data.searchRecipeByClassName(className)) {
				unknown.push(className);
				continue;
			}
			enabled.add(className);
		}
		return [...enabled];
	}

	/**
	 * This app's defaults win unless the user customised a cap in the old
	 * tools (a value differing from every stock table). Blocked resources
	 * become a cap of zero.
	 */
	private convertResourceLimits(source: OldProductionData, defaults: Record<string, number> | undefined): Record<string, number> | undefined
	{
		const limits = {...(defaults ?? {})};
		let changed = false;

		for (const [className, value] of Object.entries(source.request.resourceMax ?? {})) {
			if (className === SpecialClasses.WaterItem || typeof value !== 'number' || value >= Number.MAX_SAFE_INTEGER) {
				continue;
			}
			if (OLD_DEFAULT_LIMITS.some(table => table[className] === value)) {
				continue;
			}
			limits[className] = value;
			changed = true;
		}

		for (const className of source.request.blockedResources ?? []) {
			if (className === SpecialClasses.WaterItem) {
				continue;
			}
			limits[className] = 0;
			changed = true;
		}

		if (!changed) {
			return defaults;
		}
		return limits;
	}

}
