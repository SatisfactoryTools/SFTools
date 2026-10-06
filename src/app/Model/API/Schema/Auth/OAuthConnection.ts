export interface OAuthConnection
{
	readonly provider: string;
	readonly email: string | null;
	readonly connectedAt: string;
	readonly nickname?: string | null;
	readonly avatarUrl?: string | null;
	readonly canDisconnect: boolean;
}
