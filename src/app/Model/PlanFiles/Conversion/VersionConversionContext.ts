import {Data} from '@src/Model/Data/Data';

/** `source` is null when the file's version could not be loaded: then only removals are detected. */
export class VersionConversionContext
{

	public constructor(
		public readonly source: Data | null,
		public readonly target: Data,
		public readonly targetDefaultRecipes: ReadonlySet<string>,
	)
	{
	}

	/** Pseudo items such as the power and sink point targets (`__power_target`) exist in every version. */
	public hasItem(className: string): boolean
	{
		return className === '' || className.startsWith('__') || this.target.searchItemByClassName(className) !== undefined;
	}

	public recipeName(className: string): string
	{
		return this.source?.searchRecipeByClassName(className)?.name
			?? this.target.searchRecipeByClassName(className)?.name
			?? VersionConversionContext.readable(className);
	}

	public itemName(className: string): string
	{
		return this.source?.searchItemByClassName(className)?.name
			?? this.target.searchItemByClassName(className)?.name
			?? VersionConversionContext.readable(className);
	}

	public buildingName(className: string): string
	{
		return this.source?.searchBuildingByClassName(className)?.name
			?? this.target.searchBuildingByClassName(className)?.name
			?? VersionConversionContext.readable(className);
	}

	/** Without the original version a removed class has no name left; `Recipe_Alternate_PureIronIngot_C` still reads well enough. */
	private static readable(className: string): string
	{
		return className
			.replace(/^(Desc|Recipe|Build|BP)_/, '')
			.replace(/_C$/, '')
			.replace(/_/g, ' ')
			.replace(/([a-z])([A-Z])/g, '$1 $2')
			.trim() || className;
	}

	public static differs(a: number, b: number): boolean
	{
		return Math.abs(a - b) > 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
	}

}
