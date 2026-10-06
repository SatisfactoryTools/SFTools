/** Power and machine weights are deliberately small so raw resources dominate by default. */
export class OptimisationDefaults
{

	public static readonly infiniteResourceWeight = 0.01;

	/** Iron limit / own limit of the 1.0 map (SAM at its 1.0 total, not the old tools' pre-release ~99); versions with world data derive these live. */
	public static readonly resourceWeights: Record<string, number> = {
		Desc_OreIron_C: 1,
		Desc_OreCopper_C: 2.4959349593495936,
		Desc_Stone_C: 1.329004329004329,
		Desc_Coal_C: 2.1773049645390072,
		Desc_OreGold_C: 6.140000000000001,
		Desc_LiquidOil_C: 7.30952380952381,
		Desc_RawQuartz_C: 6.822222222222222,
		Desc_Sulfur_C: 8.527777777777779,
		Desc_OreBauxite_C: 7.487804878048781,
		Desc_OreUranium_C: 43.85714285714286,
		Desc_NitrogenGas_C: 7.675000000000001,
		Desc_SAM_C: 9.029411764705882,
		Desc_Water_C: OptimisationDefaults.infiniteResourceWeight,
	};

	public static readonly powerWeight = 0.1;

	public static readonly machinesWeight = 0.1;

	public static resourceWeight(className: string, overrides: Record<string, number> | undefined): number
	{
		return overrides?.[className] ?? OptimisationDefaults.resourceWeights[className] ?? 1;
	}

}
