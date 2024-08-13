import {IconDefinition} from '@fortawesome/free-solid-svg-icons';

/** One entry in the settings screen's left-hand section list. */
export interface SettingsSection
{

	readonly id: string;
	readonly label: string;
	readonly icon: IconDefinition;

}
