import {ItemForm} from '@src/Model/API/Schema/Data/Parts/ItemForm';
import {Item} from '@src/Model/Data/Entities/Item';

export class MapResourceColors
{

	public static readonly GEYSER = '#ff5a36';

	public static readonly PLAYER = '#5bc0de';

	private static readonly FALLBACK = '#b8c2cc';

	// Hand-picked after the icons: the data's own fluid colours are too dark (crude oil is near black) and
	// several ores average out to the same grey, which would make them indistinguishable on the map.
	private static readonly COLORS: Record<string, string> = {
		Desc_OreIron_C: '#a26a86',
		Desc_OreCopper_C: '#e8833a',
		Desc_Stone_C: '#efe6d2',
		Desc_Coal_C: '#3a3a3a',
		Desc_OreGold_C: '#f2b632',
		Desc_RawQuartz_C: '#f39ad8',
		Desc_Sulfur_C: '#d6e03c',
		Desc_OreBauxite_C: '#b8522a',
		Desc_OreUranium_C: '#62e64c',
		Desc_SAM_C: '#8f44e6',
		Desc_LiquidOil_C: '#6b4223',
		Desc_Water_C: '#3fa9f5',
		Desc_NitrogenGas_C: '#b3c7d9',
	};

	public color(className: string, item: Item | undefined): string
	{
		const known = MapResourceColors.COLORS[className];
		if (known !== undefined) {
			return known;
		}
		// Mod resources: a fluid's colour is better than nothing.
		if (item !== undefined && item.form !== ItemForm.Solid) {
			const {r, g, b} = item.fluidColor;
			return `rgb(${r}, ${g}, ${b})`;
		}
		return MapResourceColors.FALLBACK;
	}

}
