import {Injectable, Signal, signal} from '@angular/core';
import {NotificationService} from '@src/Model/NotificationService';
import {OldToolsImportRequestService} from '@src/Model/OldTools/OldToolsImportRequestService';
import {PlanExportRequest} from '@src/Model/PlanFiles/PlanExportRequest';
import {PlanFileContent} from '@src/Model/PlanFiles/PlanFileContent';
import {SftContainer} from '@src/Model/PlanFiles/SftContainer';

/** Root-scoped because files arrive from outside the planner too (desktop file association); the planner renders the dialogs. */
@Injectable({providedIn: 'root'})
export class PlanFileDialogService
{

	private readonly exportRequestSignal = signal<PlanExportRequest | null>(null);
	public readonly exportRequest: Signal<PlanExportRequest | null> = this.exportRequestSignal.asReadonly();

	private readonly importFileSignal = signal<PlanFileContent | null>(null);
	public readonly importFile: Signal<PlanFileContent | null> = this.importFileSignal.asReadonly();

	public constructor(
		private readonly oldToolsImports: OldToolsImportRequestService,
		private readonly notifications: NotificationService,
	)
	{
	}

	public openExport(request: PlanExportRequest): void
	{
		this.exportRequestSignal.set(request);
	}

	public closeExport(): void
	{
		this.exportRequestSignal.set(null);
	}

	/** Needs a user gesture (a click or a key press), like any file picker. */
	public pickFile(): void
	{
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.sft';
		input.addEventListener('change', () => {
			const file = input.files?.[0];
			if (file) {
				void this.openBlob(file);
			}
		});
		input.click();
	}

	public async openBlob(file: File): Promise<void>
	{
		try {
			this.openFile({name: file.name, content: await file.text()});
		} catch {
			this.notifications.show(`Could not read "${file.name}".`);
		}
	}

	public openFile(file: PlanFileContent): void
	{
		const format = SftContainer.format(file.content);
		if (format === SftContainer.oldToolsFormat) {
			this.oldToolsImports.request({shareKeys: [], sourceVersion: null, localLines: false, files: [file]});
		} else if (format === SftContainer.planFormat) {
			this.importFileSignal.set(file);
		} else if (format !== null && /^[0-9]$/.test(format)) {
			this.notifications.show(`"${file.name}" was made by a newer version of Satisfactory Tools. Update the app to import it.`);
		} else {
			this.notifications.show(`"${file.name}" is not a Satisfactory Tools export.`);
		}
	}

	public closeImport(): void
	{
		this.importFileSignal.set(null);
	}

}
