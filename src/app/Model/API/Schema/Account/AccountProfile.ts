import {AccountConnection} from '@src/Model/API/Schema/Account/AccountConnection';
import {SupporterProfile} from '@src/Model/API/Schema/Account/SupporterProfile';

export interface AccountProfile
{
	readonly id: string;
	readonly login: string;
	readonly email: string | null;
	readonly displayName: string | null;
	readonly name: string;
	readonly avatarUrl: string | null;
	readonly hasPassword: boolean;
	readonly helpEditor: boolean;
	readonly createdAt: string;
	readonly connections: AccountConnection[];
	/** Missing on an older backend. */
	readonly supporter?: SupporterProfile | null;
}
