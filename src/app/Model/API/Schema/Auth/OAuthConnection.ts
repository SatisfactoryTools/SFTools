export interface OAuthConnection
{
	readonly provider: string;
	/** Email the provider reported at link time; always null for Steam. */
	readonly email: string | null;
	readonly connectedAt: string;
	/** False when removing this connection would lock the user out (last method, no password). */
	readonly canDisconnect: boolean;
}
