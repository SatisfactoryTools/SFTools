import {OAuthConnection} from '@src/Model/API/Schema/Auth/OAuthConnection';

export interface OAuthConnectionsResponse
{
	readonly hasPassword: boolean;
	readonly connections: OAuthConnection[];
}
