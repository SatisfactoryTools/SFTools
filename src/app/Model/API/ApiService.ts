import {Injectable, signal} from '@angular/core';
import {httpResource} from '@angular/common/http';
import {env} from '@env/env';
import {Version} from '@src/Model/API/Schema/Version';
import {VersionFile} from '@src/Model/API/Schema/VersionFile';

@Injectable({providedIn: 'root'})
export class ApiService
{

	private versionDataPathSignal = signal<string | null>(null);

	public versionsResource = httpResource<Version[]>(() => `${env.apiUrl}/v1/versions`);
	public versionDataResource = httpResource<VersionFile>(() => {
		const path = this.versionDataPathSignal();
		return path ? `${env.apiUrl}/${path}` : undefined;
	});

	public setVersionDataPath(path: string | null): void
	{
		this.versionDataPathSignal.set(path);
	}

}
