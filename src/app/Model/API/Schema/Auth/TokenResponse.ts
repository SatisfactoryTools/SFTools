export interface TokenResponse
{
	readonly tokenType: 'Bearer';
	readonly accessToken: string;
	readonly refreshToken: string;
	readonly expiresIn: number;
}
