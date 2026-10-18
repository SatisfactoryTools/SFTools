import {Injectable} from '@angular/core';
import {firstValueFrom} from 'rxjs';
import {VersionsApiService} from '@src/Model/API/VersionsApiService';
import {Data} from '@src/Model/Data/Data';
import {DataTransformer} from '@src/Model/Data/DataTransformer';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {PlanFileVersion} from '@src/Model/PlanFiles/PlanFileVersion';

/** Null when the version is gone or unreachable (deleted custom version, offline): the import then only detects removals. */
@Injectable({providedIn: 'root'})
export class SourceVersionLoader
{

	public constructor(
		private readonly versionManager: VersionManager,
		private readonly versionsApi: VersionsApiService,
		private readonly transformer: DataTransformer,
	)
	{
	}

	public async load(reference: PlanFileVersion): Promise<Data | null>
	{
		if (this.versionManager.activeVersion()?.id === reference.id) {
			return this.versionManager.activeVersionData();
		}
		try {
			const version = this.versionManager.versions().find(candidate => candidate.id === reference.id)
				?? await firstValueFrom(this.versionsApi.getVersion(reference.id));
			const file = await firstValueFrom(this.versionsApi.loadVersionFile(version));
			return this.transformer.transform(file, version.worldData?.limits ?? null);
		} catch {
			return null;
		}
	}

}
