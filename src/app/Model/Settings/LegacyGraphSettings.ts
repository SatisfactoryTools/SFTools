import {NodeColors} from '@src/Model/Settings/NodeColors';

/** Graph keys saved before the node colours were renamed; only SettingsDefaults.normalize reads them. */
export interface LegacyGraphSettings
{

	readonly nodeColors?: Partial<NodeColors>;

	readonly nodeFillStrength?: number;

}
