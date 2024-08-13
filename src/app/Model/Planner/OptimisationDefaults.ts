/**
 * Default solver optimisation weights. The per-resource weights reflect the
 * resources' relative scarcity (iron = 1 is the baseline); power and machine
 * weights are deliberately small so raw resources dominate by default.
 */
export class OptimisationDefaults
{

	public static readonly resourceWeights: Record<string, number> = {
		Desc_OreIron_C: 1,
		Desc_OreCopper_C: 2.4959349593495936,
		Desc_Stone_C: 1.3175965665236051,
		Desc_Coal_C: 2.1773049645390072,
		Desc_OreGold_C: 6.140000000000001,
		Desc_LiquidOil_C: 7.30952380952381,
		Desc_RawQuartz_C: 6.822222222222222,
		Desc_Sulfur_C: 8.527777777777779,
		Desc_OreBauxite_C: 7.487804878048781,
		Desc_OreUranium_C: 43.85714285714286,
		Desc_NitrogenGas_C: 7.675000000000001,
		Desc_SAM_C: 99.029411764705882,
		Desc_Water_C: 0.01,
	};

	/** Weight per MW of average machine draw. */
	public static readonly powerWeight = 0.1;

	/** Weight per machine built. */
	public static readonly machinesWeight = 0.1;

	/** Effective weight of one raw resource: user override, else the default, else the iron baseline. */
	public static resourceWeight(className: string, overrides: Record<string, number> | undefined): number
	{
		return overrides?.[className] ?? OptimisationDefaults.resourceWeights[className] ?? 1;
	}

}
