import {Injectable, Injector} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {Router} from '@angular/router';
import {filter, firstValueFrom} from 'rxjs';
import {Version} from '@src/Model/API/Schema/Version';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {PlanFileContent} from '@src/Model/PlanFiles/PlanFileContent';
import {PlanFileDialogService} from '@src/Model/PlanFiles/PlanFileDialogService';
import {PlanFileReader} from '@src/Model/PlanFiles/PlanFileReader';
import {SftContainer} from '@src/Model/PlanFiles/SftContainer';

/** For files opened from outside the planner: the import dialogs live there, so the app goes to the planner first. */
@Injectable({providedIn: 'root'})
export class PlanFileOpenService
{

	public constructor(
		private readonly dialogs: PlanFileDialogService,
		private readonly versionManager: VersionManager,
		private readonly reader: PlanFileReader,
		private readonly router: Router,
		private readonly injector: Injector,
	)
	{
	}

	public async open(file: PlanFileContent): Promise<void>
	{
		this.dialogs.openFile(file);
		if (/^\/[^/]+\/planner(\/|$)/.test(this.router.url.split(/[?#]/)[0])) {
			return;
		}
		const version = this.versionManager.activeVersion() ?? await this.versionFor(file);
		if (version !== null) {
			await this.router.navigate(['/', this.versionManager.urlSlug(version), 'planner']);
		}
	}

	/** The file's own version when the user has it, so nothing needs converting; otherwise the default one. */
	private async versionFor(file: PlanFileContent): Promise<Version | null>
	{
		await firstValueFrom(toObservable(this.versionManager.ready, {injector: this.injector}).pipe(filter(ready => ready)));
		if (SftContainer.format(file.content) === SftContainer.planFormat) {
			try {
				const id = (await this.reader.read(file.content)).version.id;
				const own = this.versionManager.versions().find(version => version.id === id);
				if (own) {
					return own;
				}
			} catch {
				// The import dialog reports a broken file.
			}
		}
		return this.versionManager.defaultPublicVersion(false);
	}

}
