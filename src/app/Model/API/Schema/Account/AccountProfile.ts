import {AccountConnection} from '@src/Model/API/Schema/Account/AccountConnection';

/** The signed-in user's profile (GET/PUT /v1/account, see account-and-plan-counts.md). */
export interface AccountProfile
{
	readonly id: string;
	readonly login: string;
	readonly email: string | null;
	/** Self-chosen name; null when the user never set one. */
	readonly displayName: string | null;
	/** The resolved greeting name: displayName, else login (password accounts), else a provider nickname, else login. */
	readonly name: string;
	/** First available provider avatar (provider CDN URL), or null. */
	readonly avatarUrl: string | null;
	readonly hasPassword: boolean;
	readonly createdAt: string;
	/** Oldest connection first. */
	readonly connections: AccountConnection[];
}
