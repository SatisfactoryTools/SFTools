import {DependencyDataSchema} from '@src/Model/API/Schema/Data/Parts/DependencyDataSchema';
import {Event} from '@src/Model/API/Schema/Data/Parts/Event';
import {ItemAmountSchema} from '@src/Model/API/Schema/Data/Parts/ItemAmountSchema';
import {SchematicType} from '@src/Model/API/Schema/Data/Parts/SchematicType';
import {UnlockDataSchema} from '@src/Model/API/Schema/Data/Parts/UnlockDataSchema';

export interface SchematicSchema
{

	className: string;
	icon: string | null;
	name: string;
	description: string;
	tier: number;
	cost: ItemAmountSchema[];
	type: SchematicType;
	time: number;
	unlock: UnlockDataSchema;
	dependency: DependencyDataSchema;
	dependenciesBlockAccess: boolean;
	dependenciesHide: boolean;
	events: Event[];

}
