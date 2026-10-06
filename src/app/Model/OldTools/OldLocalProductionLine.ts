import {OldGameVersion} from '@src/Model/OldTools/OldGameVersion';
import {OldProductionData} from '@src/Model/OldTools/OldProductionData';

export interface OldLocalProductionLine
{
	readonly data: OldProductionData;
	readonly gameVersion: OldGameVersion;
}
