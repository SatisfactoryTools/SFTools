export interface OAuthStartResponse
{
	readonly authorizationUrl: string;
	readonly state: string;
	readonly pollToken?: string;
	readonly confirmCode?: string;
}
