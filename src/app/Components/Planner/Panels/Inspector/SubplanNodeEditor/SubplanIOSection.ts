import {SubplanIORateDraft} from '@src/Components/Planner/Panels/Inspector/SubplanNodeEditor/SubplanIORateDraft';

export interface SubplanIOSection
{

	readonly key: 'products' | 'byproducts' | 'inputs';

	readonly label: string;

	readonly rows: SubplanIORateDraft[];

}
