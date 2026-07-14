import {DataSchema} from '@src/Model/API/Schema/Data/DataSchema';
import {VersionMetadata} from '@src/Model/API/Schema/VersionMetadata';
import {Building} from '@src/Model/Data/Entities/Building';
import {Item} from '@src/Model/Data/Entities/Item';
import {Material} from '@src/Model/Data/Entities/Material';
import {ItemAmount} from '@src/Model/Data/Entities/Parts/ItemAmount';
import {Recipe} from '@src/Model/Data/Entities/Recipe';
import {Schematic} from '@src/Model/Data/Entities/Schematic';

export class Data
{

	public readonly items: Item[];
	public readonly schematics: Schematic[];
	public readonly recipes: Recipe[];
	public readonly buildings: Building[];
	public readonly materials: Material[];
	public readonly resources: string[];
	/**
	 * Per-minute resource caps from metadata.world.limits, falling back to the
	 * caps passed by the caller (the version record's worldData.limits - data
	 * files of official versions carry the generator's raw world output without
	 * limits); null when neither has any.
	 */
	public readonly worldLimits: Record<string, number> | null;

	private readonly itemMap: Map<string, Item>;
	private readonly schematicMap: Map<string, Schematic>;
	private readonly recipeMap: Map<string, Recipe>;
	private readonly buildingMap: Map<string, Building>;
	private readonly materialMap: Map<string, Material>;
	private readonly buildingRecipeMap: Map<string, Recipe>;

	// Reverse-lookup indexes for the codex, built lazily on first use.
	private recipesByProduct: Map<string, Recipe[]> | null = null;
	private recipesByIngredient: Map<string, Recipe[]> | null = null;
	private buildingsByCostItem: Map<string, Building[]> | null = null;
	private schematicsByCostItem: Map<string, Schematic[]> | null = null;
	private schematicsByUnlockedRecipe: Map<string, Schematic[]> | null = null;
	private recipesByBuilding: Map<string, Recipe[]> | null = null;
	private buildingsByBuildRecipe: Map<string, Building> | null = null;

	public constructor(schema: DataSchema, metadata?: VersionMetadata, fallbackWorldLimits: Record<string, number> | null = null)
	{
		this.worldLimits = metadata?.world?.limits ?? fallbackWorldLimits;

		// Items have no entity dependencies - build first
		this.items = Object.values(schema.items).map(s => new Item(s));
		this.itemMap = new Map(this.items.map(i => [i.className, i]));

		// Materials and buildings both depend only on items
		this.materials = Object.values(schema.materials).map(s => new Material(s, this.itemMap));
		this.materialMap = new Map(this.materials.map(m => [m.className, m]));
		this.buildings = Object.values(schema.buildings).map(s => new Building(s, this.itemMap));
		this.buildingMap = new Map(this.buildings.map(b => [b.className, b]));

		// Recipes depend on items and buildings
		this.recipes = Object.values(schema.recipes).map(s => new Recipe(s, this.itemMap, this.buildingMap));
		this.recipeMap = new Map(this.recipes.map(r => [r.className, r]));

		// Build-gun recipes produce buildings, which are not items - the
		// hydrated product references are useless, so index build recipes by
		// building from the schema while it is still at hand.
		this.buildingRecipeMap = new Map();
		Object.values(schema.recipes).forEach(s => {
			if (!s.inBuildGun) {
				return;
			}
			s.products.forEach(p => {
				if (this.buildingMap.has(p.item) && !this.buildingRecipeMap.has(p.item)) {
					this.buildingRecipeMap.set(p.item, this.recipeMap.get(s.className)!);
				}
			});
		});

		// Schematics reference each other (unlock/dependency lists).
		// Pass a shared map by reference - it is populated in the next line,
		// but schematic getters are lazy so they only read it when first accessed.
		this.schematicMap = new Map<string, Schematic>();
		this.schematics = Object.values(schema.schematics).map(s => new Schematic(s, this.itemMap, this.recipeMap, this.schematicMap));
		this.schematics.forEach(s => this.schematicMap.set(s.className, s));

		this.resources = schema.resources;
	}

	public getAutomatableItems(): Item[]
	{
		const classNames = new Set<string>();

		this.recipes.forEach(recipe => {
			if (recipe.producedIn.length > 0) {
				recipe.products.forEach(p => classNames.add(p.item.className));
			}
		});

		this.buildings.forEach(building => {
			building.fuel.forEach(fuel => {
				if (fuel.byproduct) {
					classNames.add(fuel.byproduct.className);
				}
			});
		});

		return this.items.filter(item => classNames.has(item.className));
	}

	public searchItemByClassName(className: string): Item|undefined
	{
		return this.itemMap.get(className);
	}

	public getItemByClassName(className: string): Item
	{
		const item = this.searchItemByClassName(className);
		if (!item) {
			throw new Error(`Item ${className} not found`);
		}
		return item;
	}

	public searchSchematicByClassName(className: string): Schematic|undefined
	{
		return this.schematicMap.get(className);
	}

	public getSchematicByClassName(className: string): Schematic
	{
		const schematic = this.searchSchematicByClassName(className);
		if (!schematic) {
			throw new Error(`Schematic ${className} not found`);
		}
		return schematic;
	}

	public searchRecipeByClassName(className: string): Recipe|undefined
	{
		return this.recipeMap.get(className);
	}

	public getRecipeByClassName(className: string): Recipe
	{
		const recipe = this.searchRecipeByClassName(className);
		if (!recipe) {
			throw new Error(`Recipe ${className} not found`);
		}
		return recipe;
	}

	public searchBuildingByClassName(className: string): Building|undefined
	{
		return this.buildingMap.get(className);
	}

	public getBuildingByClassName(className: string): Building
	{
		const building = this.searchBuildingByClassName(className);
		if (!building) {
			throw new Error(`Building ${className} not found`);
		}
		return building;
	}

	/** Icon hash for an item or building by class name, whichever exists; null if neither has one. */
	public iconForClassName(className: string): string | null
	{
		return this.searchItemByClassName(className)?.icon
			?? this.searchBuildingByClassName(className)?.icon
			?? null;
	}

	public searchMaterialByClassName(className: string): Material|undefined
	{
		return this.materialMap.get(className);
	}

	public getMaterialByClassName(className: string): Material
	{
		const material = this.searchMaterialByClassName(className);
		if (!material) {
			throw new Error(`Material ${className} not found`);
		}
		return material;
	}

	public getRecipesForMachines(): Recipe[]
	{
		return this.recipes.filter(r => r.producedIn.length > 0);
	}

	/** Buildings running at least one manufacturing recipe, sorted by name. */
	public getProductionMachines(): Building[]
	{
		const classNames = new Set<string>();
		this.recipes.forEach(recipe => recipe.producedIn.forEach(building => {
			// Hydration tolerates dangling references (mods) - skip them here.
			if (building) {
				classNames.add(building.className);
			}
		}));
		return this.buildings
			.filter(building => classNames.has(building.className))
			.sort((a, b) => a.name.localeCompare(b.name));
	}

	/** The build-gun recipe constructing the given building; its ingredients are the build cost. */
	public searchBuildRecipeForBuilding(buildingClassName: string): Recipe|undefined
	{
		return this.buildingRecipeMap.get(buildingClassName);
	}

	/** Fuel-burning power generators (geothermal has no fuel and is excluded). */
	public getPowerGenerators(): Building[]
	{
		return this.buildings.filter(b => b.powerProduction > 0 && b.fuel.length > 0);
	}

	// ── Codex reverse lookups ─────────────────────────────────────────────

	/** Recipes with the item among their products (build-gun recipes excluded). */
	public getRecipesProducingItem(className: string): Recipe[]
	{
		this.recipesByProduct ??= this.buildRecipeItemIndex(recipe => recipe.products);
		return this.recipesByProduct.get(className) ?? [];
	}

	/** Recipes with the item among their ingredients (build-gun recipes excluded - see getBuildingsCostingItem). */
	public getRecipesUsingItem(className: string): Recipe[]
	{
		this.recipesByIngredient ??= this.buildRecipeItemIndex(recipe => recipe.ingredients);
		return this.recipesByIngredient.get(className) ?? [];
	}

	/** Buildings whose build cost includes the item. */
	public getBuildingsCostingItem(className: string): Building[]
	{
		if (this.buildingsByCostItem === null) {
			const index = new Map<string, Building[]>();
			this.buildings.forEach(building => {
				this.searchBuildRecipeForBuilding(building.className)?.ingredients.forEach(({item}) => {
					if (!item) return;
					this.addToIndex(index, item.className, building);
				});
			});
			this.buildingsByCostItem = index;
		}
		return this.buildingsByCostItem.get(className) ?? [];
	}

	/** Schematics whose research cost includes the item. */
	public getSchematicsCostingItem(className: string): Schematic[]
	{
		if (this.schematicsByCostItem === null) {
			const index = new Map<string, Schematic[]>();
			this.schematics.forEach(schematic => {
				schematic.cost.forEach(({item}) => {
					if (!item) return;
					this.addToIndex(index, item.className, schematic);
				});
			});
			this.schematicsByCostItem = index;
		}
		return this.schematicsByCostItem.get(className) ?? [];
	}

	/** Schematics that unlock the recipe. */
	public getSchematicsUnlockingRecipe(recipeClassName: string): Schematic[]
	{
		if (this.schematicsByUnlockedRecipe === null) {
			const index = new Map<string, Schematic[]>();
			this.schematics.forEach(schematic => {
				schematic.unlock.recipes.forEach(recipe => {
					if (!recipe) return;
					this.addToIndex(index, recipe.className, schematic);
				});
			});
			this.schematicsByUnlockedRecipe = index;
		}
		return this.schematicsByUnlockedRecipe.get(recipeClassName) ?? [];
	}

	/** Schematics that unlock the building (via its build-gun recipe). */
	public getSchematicsUnlockingBuilding(buildingClassName: string): Schematic[]
	{
		const recipe = this.searchBuildRecipeForBuilding(buildingClassName);
		return recipe ? this.getSchematicsUnlockingRecipe(recipe.className) : [];
	}

	/** Manufacturing recipes the building can run. */
	public getRecipesForBuilding(buildingClassName: string): Recipe[]
	{
		if (this.recipesByBuilding === null) {
			const index = new Map<string, Recipe[]>();
			this.recipes.forEach(recipe => {
				recipe.producedIn.forEach(building => {
					if (!building) return;
					this.addToIndex(index, building.className, recipe);
				});
			});
			this.recipesByBuilding = index;
		}
		return this.recipesByBuilding.get(buildingClassName) ?? [];
	}

	/** The building a build-gun recipe constructs, if any. */
	public searchBuildingForBuildRecipe(recipeClassName: string): Building|undefined
	{
		if (this.buildingsByBuildRecipe === null) {
			const index = new Map<string, Building>();
			this.buildingRecipeMap.forEach((recipe, buildingClassName) => {
				const building = this.buildingMap.get(buildingClassName);
				if (building) {
					index.set(recipe.className, building);
				}
			});
			this.buildingsByBuildRecipe = index;
		}
		return this.buildingsByBuildRecipe.get(recipeClassName);
	}

	private buildRecipeItemIndex(amountsOf: (recipe: Recipe) => ItemAmount[]): Map<string, Recipe[]>
	{
		const index = new Map<string, Recipe[]>();
		this.recipes.forEach(recipe => {
			if (recipe.inBuildGun) return;
			amountsOf(recipe).forEach(({item}) => {
				// Hydration tolerates dangling references (mods) - skip them here.
				if (!item) return;
				this.addToIndex(index, item.className, recipe);
			});
		});
		return index;
	}

	private addToIndex<T>(index: Map<string, T[]>, key: string, value: T): void
	{
		const list = index.get(key);
		if (list === undefined) {
			index.set(key, [value]);
		} else if (!list.includes(value)) {
			list.push(value);
		}
	}

}
