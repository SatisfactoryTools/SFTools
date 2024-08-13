import {OAuthConnection} from '@src/Model/API/Schema/Auth/OAuthConnection';

export interface OAuthConnectionsResponse
{
	/** Whether the account also has a username/password login. */
	readonly hasPassword: boolean;
	readonly connections: OAuthConnection[];
}
