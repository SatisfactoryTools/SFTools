import {IconDefinition} from '@fortawesome/free-solid-svg-icons';
import {AddNodeType} from '@src/Components/Planner/AddNode/AddNodeType';

/** One selectable node kind in the Add-node dialog's type toggles. */
export interface AddNodeTypeOption
{

	readonly type: AddNodeType;
	readonly label: string;
	readonly icon: IconDefinition;

}
