import {Injectable} from '@angular/core';
import {Data} from '@src/Model/Data/Data';
import {Recipe} from '@src/Model/Data/Entities/Recipe';
import {SpecialClasses} from '@src/Model/Planner/SpecialClasses';

@Injectable({providedIn: 'root'})
export class ResourceConversionRecipeResolver
{

	public resolve(data: Data): Recipe[]
	{
		if (data.searchBuildingByClassName(SpecialClasses.ConverterBuilding) === undefined) {
			return [];
		}
		const resources = new Set(data.resources);
		return data.getRecipesForBuilding(SpecialClasses.ConverterBuilding)
			.filter(recipe => this.isResourceConversion(recipe, resources));
	}

	private isResourceConversion(recipe: Recipe, resources: Set<string>): boolean
	{
		if (recipe.alternate || recipe.ingredients.length !== 2 || recipe.products.length !== 1) {
			return false;
		}
		const sam = recipe.ingredients.find(ingredient => ingredient.item.className === SpecialClasses.ReanimatedSamItem);
		const source = recipe.ingredients.find(ingredient => ingredient.item.className !== SpecialClasses.ReanimatedSamItem);
		const product = recipe.products[0].item.className;
		return sam !== undefined
			&& source !== undefined
			&& resources.has(source.item.className)
			&& resources.has(product)
			&& product !== source.item.className;
	}

}
