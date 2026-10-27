import {VersionWorldMetadata} from '@src/Model/API/Schema/VersionWorldMetadata';

export interface VersionMetadata
{

	readonly world?: VersionWorldMetadata;
	readonly map?: string;
	readonly worldNodes?: string;
	readonly collectibles?: string;

}
