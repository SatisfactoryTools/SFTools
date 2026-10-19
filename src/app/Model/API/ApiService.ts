import {Injectable, signal} from '@angular/core';
import {httpResource} from '@angular/common/http';
import {env} from '@env/env';
import {Version} from '@src/Model/API/Schema/Version';
import {VersionFile} from '@src/Model/API/Schema/VersionFile';

@Injectable({providedIn: 'root'})
export class ApiService
{

	private versionDataPathSignal = signal<string | null>(null);
	public versionDataPath = this.versionDataPathSignal.asReadonly();

	public versionsResource = httpResource<Version[]>(() => `${env.apiUrl}/v1/versions`, {parse: body => this.parseVersions(body)});
	public versionDataResource = httpResource<VersionFile>(() => {
		const path = this.versionDataPathSignal();
		return path ? `${env.apiUrl}/${path}` : undefined;
	});

	public setVersionDataPath(path: string | null): void
	{
		this.versionDataPathSignal.set(path);
	}

	private parseVersions(body: unknown): Version[]
	{
		if (!Array.isArray(body)) {
			throw new Error('The version list response is not a list.');
		}
		return body as Version[];
	}

}
