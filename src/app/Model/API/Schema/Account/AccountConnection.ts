/** One connected sign-in provider as reported by GET /v1/account. */
export interface AccountConnection
{
	readonly provider: string;
	/** The provider's nickname (Discord global name, GitHub login, …); null until the user signs in through it again. */
	readonly nickname: string | null;
	readonly avatarUrl: string | null;
}
