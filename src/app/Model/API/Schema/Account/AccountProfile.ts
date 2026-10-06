import {AccountConnection} from '@src/Model/API/Schema/Account/AccountConnection';

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
}
