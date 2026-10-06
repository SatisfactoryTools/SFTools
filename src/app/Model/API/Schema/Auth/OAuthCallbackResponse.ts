export interface OAuthCallbackResponse
{
	readonly provider: string;
	readonly tokenType?: 'Bearer';
	readonly accessToken?: string;
	readonly refreshToken?: string;
	readonly expiresIn?: number;
	readonly linked?: boolean;
	readonly message?: string;
	readonly desktop?: boolean;
}
