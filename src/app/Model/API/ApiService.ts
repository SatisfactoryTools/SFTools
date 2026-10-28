import {Injectable, signal} from '@angular/core';
import {httpResource} from '@angular/common/http';
import {env} from '@env/env';
import {Version} from '@src/Model/API/Schema/Version';
import {VersionFileCaching} from '@src/Model/API/VersionFileCaching';
import {VersionFile} from '@src/Model/API/Schema/VersionFile';
import {VersionResponseParser} from '@src/Model/API/VersionResponseParser';

@Injectable({providedIn: 'root'})
export class ApiService
{

	private versionDataPathSignal = signal<string | null>(null);
	public versionDataPath = this.versionDataPathSignal.asReadonly();

	public versionsResource = httpResource<Version[]>(() => `${env.apiUrl}/v1/versions`, {parse: body => this.versionParser.parseVersionList(body)});
	public versionDataResource = httpResource<VersionFile>(() => {
		const path = this.versionDataPathSignal();
		return path ? {url: `${env.apiUrl}/${path}`, cache: VersionFileCaching.mode(path)} : undefined;
	});

	public constructor(private readonly versionParser: VersionResponseParser)
	{
	}

	public setVersionDataPath(path: string | null): void
	{
		this.versionDataPathSignal.set(path);
	}

}
