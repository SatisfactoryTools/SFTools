import {OldGameVersion} from '@src/Model/OldTools/OldGameVersion';
import {OldProductionData} from '@src/Model/OldTools/OldProductionData';

/** A production line the old Satisfactory Tools saved in this browser, with the version it was made for. */
export interface OldLocalProductionLine
{
	readonly data: OldProductionData;
	readonly gameVersion: OldGameVersion;
}
