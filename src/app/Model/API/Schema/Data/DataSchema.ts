import {BuildingSchema} from '@src/Model/API/Schema/Data/BuildingSchema';
import {ItemSchema} from '@src/Model/API/Schema/Data/ItemSchema';
import {MaterialSchema} from '@src/Model/API/Schema/Data/MaterialSchema';
import {RecipeSchema} from '@src/Model/API/Schema/Data/RecipeSchema';
import {SchematicSchema} from '@src/Model/API/Schema/Data/SchematicSchema';

export interface DataSchema
{

	items: Record<string, ItemSchema>;
	schematics: Record<string, SchematicSchema>;
	recipes: Record<string, RecipeSchema>;
	buildings: Record<string, BuildingSchema>;
	materials: Record<string, MaterialSchema>;
	resources: string[];

}
