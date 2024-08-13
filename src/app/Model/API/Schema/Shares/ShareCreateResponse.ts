import {ShareType} from '@src/Model/API/Schema/Shares/ShareType';

export interface ShareCreateResponse
{
	/** The share UUID - the frontend builds the share link from it. */
	share: string;
	type: ShareType;
	createdAt: string;
}
