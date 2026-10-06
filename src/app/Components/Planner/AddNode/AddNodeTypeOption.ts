import {IconDefinition} from '@fortawesome/free-solid-svg-icons';
import {AddNodeType} from '@src/Components/Planner/AddNode/AddNodeType';

export interface AddNodeTypeOption
{

	readonly type: AddNodeType;
	readonly label: string;
	readonly icon: IconDefinition;

}
