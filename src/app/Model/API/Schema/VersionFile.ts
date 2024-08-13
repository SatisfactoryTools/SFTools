import {DataSchema} from '@src/Model/API/Schema/Data/DataSchema';
import {VersionMetadata} from '@src/Model/API/Schema/VersionMetadata';

export interface VersionFile
{

	metadata: VersionMetadata;
	data: DataSchema;

}
