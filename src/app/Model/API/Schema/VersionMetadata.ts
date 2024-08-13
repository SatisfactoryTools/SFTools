import {VersionWorldMetadata} from '@src/Model/API/Schema/VersionWorldMetadata';

export interface VersionMetadata
{

	/** World resource-node info; absent on versions imported without world data. */
	readonly world?: VersionWorldMetadata;

}
