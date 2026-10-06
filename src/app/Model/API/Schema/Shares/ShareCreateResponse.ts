import {ShareType} from '@src/Model/API/Schema/Shares/ShareType';

export interface ShareCreateResponse
{
	share: string;
	type: ShareType;
	createdAt: string;
}
