import {IconDefinition} from '@fortawesome/free-solid-svg-icons';
import {HotkeyItem} from '@src/Model/Hotkeys/HotkeyItem';

export interface ContextMenuItem extends HotkeyItem
{
	readonly label: string;
	readonly icon?: IconDefinition;
	readonly disabled?: boolean;
	readonly hint?: string;
	readonly action: () => void;
}
