import {Injectable} from '@angular/core';
import {Version} from '@src/Model/API/Schema/Version';

// A mangled body (seen when a server cache replayed another endpoint's response) would otherwise become a version whose URL slug is 'undefined'.
@Injectable({providedIn: 'root'})
export class VersionResponseParser
{

	public parseVersion(body: unknown): Version
	{
		if (!this.isVersion(body)) {
			throw new Error('The version response is not a version.');
		}
		return body;
	}

	public parseVersionList(body: unknown): Version[]
	{
		if (!Array.isArray(body) || !body.every(entry => this.isVersion(entry))) {
			throw new Error('The version list response is not a list of versions.');
		}
		return body;
	}

	private isVersion(body: unknown): body is Version
	{
		const version = body as Partial<Version> | null;
		return typeof version === 'object' && version !== null && !Array.isArray(version)
			&& typeof version.id === 'string' && typeof version.dataPath === 'string';
	}

}
