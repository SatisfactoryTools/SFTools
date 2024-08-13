/**
 * Result of completing an OAuth flow: a token pair for a login/signup flow,
 * or `linked: true` (no tokens) when the flow was started with a Bearer
 * token and the provider was attached to the signed-in account.
 */
export interface OAuthCallbackResponse
{
	readonly provider: string;
	readonly tokenType?: 'Bearer';
	readonly accessToken?: string;
	readonly refreshToken?: string;
	readonly expiresIn?: number;
	readonly linked?: boolean;
	readonly message?: string;
}
