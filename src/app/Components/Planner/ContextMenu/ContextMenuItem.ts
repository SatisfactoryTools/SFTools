import {IconDefinition} from '@fortawesome/free-solid-svg-icons';

export interface ContextMenuItem
{
	readonly label: string;
	readonly icon?: IconDefinition;
	readonly disabled?: boolean;
	readonly action: () => void;
}
