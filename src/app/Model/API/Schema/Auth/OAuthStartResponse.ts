export interface OAuthStartResponse
{
	/** Where to send the browser; the provider redirects back to /auth/callback/{provider}. */
	readonly authorizationUrl: string;
	/** Backend-persisted and single-use; returned for debugging only. */
	readonly state: string;
}
