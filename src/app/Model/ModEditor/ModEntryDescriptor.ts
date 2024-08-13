import {ModFieldDescriptor} from '@src/Model/ModEditor/ModFieldDescriptor';

/** One entry collection of the mod data (items, recipes, …) and its editable fields. */
export interface ModEntryDescriptor
{
	/** The DataSchema record this describes. */
	readonly collection: 'items' | 'schematics' | 'recipes' | 'buildings' | 'materials';
	readonly label: string;
	readonly singular: string;
	/** Suggested className prefix, purely a hint in the add form. */
	readonly classNamePrefix: string;
	/** Every field of the schema except className (handled by the editor itself). */
	readonly fields: ModFieldDescriptor[];
}
