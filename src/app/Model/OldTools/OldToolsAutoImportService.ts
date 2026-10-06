import {Injectable, effect, signal, untracked} from '@angular/core';
import {AnalyticsService} from '@src/Model/Analytics/AnalyticsService';
import {Data} from '@src/Model/Data/Data';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {OldLocalProductionLine} from '@src/Model/OldTools/OldLocalProductionLine';
import {OldPlanImporter} from '@src/Model/OldTools/OldPlanImporter';
import {OldToolsLocalStorageService} from '@src/Model/OldTools/OldToolsLocalStorageService';
import {PlanManager} from '@src/Model/Planner/PlanManager';

const FOLDER_NAME = 'From the old Satisfactory Tools';

/** Provided by the planner, not the root: the graph layout is the planner's. */
@Injectable()
export class OldToolsAutoImportService
{

	private readonly requestedSignal = signal(false);
	private started = false;

	public constructor(
		private readonly versionManager: VersionManager,
		private readonly planManager: PlanManager,
		private readonly localLines: OldToolsLocalStorageService,
		private readonly importer: OldPlanImporter,
		private readonly analytics: AnalyticsService,
	)
	{
		effect(() => {
			const data = this.versionManager.activeVersionData();
			if (!this.requestedSignal() || this.planManager.loaded() === false || data === null || this.started) {
				return;
			}
			this.started = true;
			untracked(() => void this.copy(data));
		});
	}

	public run(): void
	{
		const version = this.versionManager.activeVersion();
		if (version === null || this.versionManager.defaultPublicVersion(version.ficsmas)?.id !== version.id) {
			return;
		}
		if (this.localLines.copied(version.ficsmas) || this.localLines.readFlavour(version.ficsmas).length === 0) {
			return;
		}
		this.requestedSignal.set(true);
	}

	private async copy(data: Data): Promise<void>
	{
		const ficsmas = this.versionManager.activeVersion()?.ficsmas ?? false;
		const lines = this.localLines.readFlavour(ficsmas);
		if (lines.length === 0) {
			return;
		}

		const plans = [];
		for (const line of lines) {
			const plan = await this.prepare(line, data);
			if (plan !== null) {
				plans.push(plan);
			}
		}

		if (plans.length > 0) {
			const folder = this.importer.fileIntoFolder(plans, FOLDER_NAME);
			this.importer.announce(plans.length, folder.name, 'Copied');
		}
		// Remembered even when nothing could be converted: the lines will not
		// convert better next time, and the dialog can still load them by hand.
		this.localLines.markCopied(ficsmas);
		this.analytics.trackEvent('OldTools', 'auto-copy', undefined, plans.length);
	}

	private async prepare(line: OldLocalProductionLine, data: Data)
	{
		try {
			const conversion = this.importer.convert(line.data, data);
			return (await this.importer.withGraph(conversion.plan, line.data, line.gameVersion, data)).plan;
		} catch {
			return null;
		}
	}

}
