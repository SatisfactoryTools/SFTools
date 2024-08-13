import {Type} from '@angular/core';
import {IconDefinition} from '@fortawesome/fontawesome-svg-core';
import {PanelSide} from '@src/Components/Planner/Panel/PanelSide';

export interface PanelDefinition
{
	readonly id: string;
	readonly label: string;
	readonly icon: IconDefinition;
	readonly component: Type<unknown>;
	readonly defaultSide: PanelSide;
	readonly openByDefault?: boolean;
	readonly defaultFloating?: boolean;
	/** Initial floating-window size; the shared default is used when omitted. */
	readonly defaultFloatWidth?: number;
	readonly defaultFloatHeight?: number;
}