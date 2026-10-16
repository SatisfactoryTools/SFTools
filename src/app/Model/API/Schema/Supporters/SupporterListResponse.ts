import {SupporterListEntry} from '@src/Model/API/Schema/Supporters/SupporterListEntry';

export interface SupporterListResponse
{
	readonly supporters: SupporterListEntry[];
}
