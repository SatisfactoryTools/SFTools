import {ShareType} from '@src/Model/API/Schema/Shares/ShareType';

export interface ShareDialogTarget
{
	readonly type: ShareType;
	readonly id: string;
	readonly name: string;
	readonly device: boolean;
}
