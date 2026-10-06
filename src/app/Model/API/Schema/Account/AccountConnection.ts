export interface AccountConnection
{
	readonly provider: string;
	readonly nickname: string | null;
	readonly avatarUrl: string | null;
}
