export interface OAuthPendingFlow
{
	readonly state: string;
	readonly provider: string;
	readonly link: boolean;
}
