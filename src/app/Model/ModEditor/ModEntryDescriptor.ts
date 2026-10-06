import {ModFieldDescriptor} from '@src/Model/ModEditor/ModFieldDescriptor';

export interface ModEntryDescriptor
{
	readonly collection: 'items' | 'schematics' | 'recipes' | 'buildings' | 'materials';
	readonly label: string;
	readonly singular: string;
	readonly classNamePrefix: string;
	readonly fields: ModFieldDescriptor[];
}
