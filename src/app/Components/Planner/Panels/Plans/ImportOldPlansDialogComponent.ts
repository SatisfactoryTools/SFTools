import {Component, ChangeDetectionStrategy, EventEmitter, Input, OnDestroy, OnInit, Output, Signal, computed, signal, HostListener} from '@angular/core';
import {RouterLink} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {Subscription} from 'rxjs';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faTriangleExclamation} from '@fortawesome/free-solid-svg-icons';
import {AppTooltipDirective} from '@src/Components/Common/AppTooltipDirective';
import {HotkeyBlockDirective} from '@src/Components/Common/HotkeyBlockDirective';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {OldPlanImporter} from '@src/Model/OldTools/OldPlanImporter';
import {OldGameVersion} from '@src/Model/OldTools/OldGameVersion';
import {OldProductionData} from '@src/Model/OldTools/OldProductionData';
import {OldToolsImportRequest} from '@src/Model/OldTools/OldToolsImportRequest';
import {OldToolsLocalStorageService} from '@src/Model/OldTools/OldToolsLocalStorageService';
import {OldToolsShareService} from '@src/Model/OldTools/OldToolsShareService';
import {SftFileParser} from '@src/Model/OldTools/SftFileParser';
import {AnalyticsService} from '@src/Model/Analytics/AnalyticsService';
import {Version} from '@src/Model/API/Schema/Version';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanIconResolver} from '@src/Model/Planner/PlanIconResolver';

interface ImportRow
{
	readonly plan: Plan;
	readonly source: OldProductionData;
	readonly sourceVersion: OldGameVersion;
	readonly iconHash: string | null;
	readonly unknownCount: number;
	readonly madeFor: string | null;
	readonly selected: boolean;
}

@Component({
	selector: 'import-old-plans-dialog',
	templateUrl: './ImportOldPlansDialogComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, FormsModule, GameIconComponent, AppTooltipDirective, InfoNoteComponent, HotkeyBlockDirective, RouterLink],
	styles: `
		.import-backdrop {
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.5);
			z-index: 1070;
			display: flex;
			align-items: center;
			justify-content: center;
		}
		.import-dialog {
			width: min(560px, calc(100vw - 2rem));
		}
		.import-dialog input[type='file']::file-selector-button {
			background-color: #4e5d6c;
			color: #ebebeb;
			border: 0;
		}
		.import-rows {
			max-height: 40vh;
			overflow-y: auto;
		}
	`,
})
export class ImportOldPlansDialogComponent implements OnInit, OnDestroy
{

	@Input() public initialRequest: OldToolsImportRequest | null = null;

	@Output() public readonly apply = new EventEmitter<Plan[]>();
	@Output() public readonly close = new EventEmitter<void>();

	public readonly faTriangleExclamation = faTriangleExclamation;

	public linksText = '';

	private readonly rowsSignal = signal<ImportRow[]>([]);
	public readonly rows: Signal<ImportRow[]> = this.rowsSignal.asReadonly();

	private readonly errorsSignal = signal<string[]>([]);
	public readonly errors: Signal<string[]> = this.errorsSignal.asReadonly();

	private readonly pendingSignal = signal(0);
	public readonly loading: Signal<boolean> = computed(() => this.pendingSignal() > 0);

	private readonly importProgressSignal = signal<{done: number; total: number} | null>(null);
	public readonly importProgress = this.importProgressSignal.asReadonly();
	public readonly importing: Signal<boolean> = computed(() => this.importProgressSignal() !== null);

	public readonly selectedCount: Signal<number> = computed(() => this.rowsSignal().filter(row => row.selected).length);

	public readonly ficsmas: boolean;
	public readonly otherFlavourVersion: Version | null;
	public readonly otherFlavourSlug: string | null;
	public readonly otherFlavourName: string;

	private readonly localCountSignal = signal(0);
	public readonly localCount: Signal<number> = this.localCountSignal.asReadonly();
	public readonly localOtherCount: number;

	private readonly loadedShareKeys = new Set<string>();
	private readonly subscriptions: Subscription[] = [];

	public constructor(
		private readonly shareService: OldToolsShareService,
		private readonly sftFileParser: SftFileParser,
		private readonly importer: OldPlanImporter,
		private readonly versionManager: VersionManager,
		private readonly planIcons: PlanIconResolver,
		private readonly localStorageLines: OldToolsLocalStorageService,
		private readonly analytics: AnalyticsService,
	)
	{
		this.ficsmas = versionManager.activeVersion()?.ficsmas ?? false;
		// defaultPublicVersion falls back across flavours, so the result's flavour must be checked.
		const other = versionManager.defaultPublicVersion(!this.ficsmas);
		this.otherFlavourVersion = other !== null && other.ficsmas === !this.ficsmas ? other : null;
		this.otherFlavourSlug = this.otherFlavourVersion === null ? null : versionManager.urlSlug(this.otherFlavourVersion);
		this.otherFlavourName = this.ficsmas ? 'regular' : 'FICSMAS';
		this.localCountSignal.set(localStorageLines.readFlavour(this.ficsmas).length);
		this.localOtherCount = localStorageLines.readFlavour(!this.ficsmas).length;
	}

	public ngOnInit(): void
	{
		const request = this.initialRequest;
		if (request === null) {
			return;
		}
		this.loadShareKeys(request.shareKeys, request.sourceVersion);
		if (request.localLines) {
			this.loadLocalLines();
		}
	}

	public loadLinks(): void
	{
		const lines = this.linksText.split('\n').map(line => line.trim()).filter(line => line !== '');
		this.linksText = '';

		const keys: string[] = [];
		for (const line of lines) {
			const key = this.shareService.extractShareKey(line);
			if (key === null) {
				this.addError(`Not a share link: "${line}"`);
				continue;
			}
			keys.push(key);
		}
		this.loadShareKeys(keys, null);
	}

	public loadLocalLines(): void
	{
		const lines = this.localStorageLines.readFlavour(this.ficsmas);
		this.localCountSignal.set(0);
		lines.forEach(line => this.addProductionLine(line.data, line.gameVersion));
		this.analytics.trackEvent('OldTools', 'load-local-lines', undefined, lines.length);
	}

	private loadShareKeys(keys: string[], sourceVersion: OldGameVersion | null): void
	{
		for (const key of keys) {
			if (this.loadedShareKeys.has(key)) {
				continue;
			}
			this.loadedShareKeys.add(key);

			this.pendingSignal.update(count => count + 1);
			this.subscriptions.push(this.shareService.fetchShare(key).subscribe({
				next: data => {
					this.pendingSignal.update(count => count - 1);
					this.addProductionLine(data, sourceVersion);
				},
				error: () => {
					this.pendingSignal.update(count => count - 1);
					this.loadedShareKeys.delete(key);
					this.addError(`Could not load the share "${key}".`);
				},
			}));
		}
	}

	public onFilePicked(event: Event): void
	{
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) {
			return;
		}

		this.pendingSignal.update(count => count + 1);
		file.text()
			.then(content => this.sftFileParser.parse(content))
			.then(tabs => {
				if (tabs.length === 0) {
					this.addError(`"${file.name}" contains no production lines.`);
				}
				tabs.forEach(tab => this.addProductionLine(tab));
			})
			.catch((error: Error) => this.addError(`${file.name}: ${error.message}`))
			.finally(() => this.pendingSignal.update(count => count - 1));
	}

	public toggleRow(planId: string): void
	{
		this.rowsSignal.update(rows => rows.map(row => row.plan.id === planId ? {...row, selected: !row.selected} : row));
	}

	public canImport(): boolean
	{
		return !this.loading() && !this.importing() && this.selectedCount() > 0;
	}

	@HostListener('document:keydown.escape')
	public onEscape(): void
	{
		this.requestClose();
	}

	public requestClose(): void
	{
		if (!this.importing()) {
			this.close.emit();
		}
	}

	public async importSelected(): Promise<void>
	{
		if (!this.canImport()) {
			return;
		}
		const selected = this.rowsSignal().filter(row => row.selected);
		const data = this.versionManager.activeVersionData();
		const plans: Plan[] = [];
		for (const row of selected) {
			this.importProgressSignal.set({done: plans.length, total: selected.length});
			plans.push(data === null ? row.plan : (await this.importer.withGraph(row.plan, row.source, row.sourceVersion, data)).plan);
		}
		this.importProgressSignal.set(null);
		this.analytics.trackEvent('OldTools', 'import-plans', undefined, plans.length);
		this.apply.emit(plans);
	}

	public ngOnDestroy(): void
	{
		this.subscriptions.forEach(subscription => subscription.unsubscribe());
	}

	private addProductionLine(data: OldProductionData, sourceVersion: OldGameVersion | null = null): void
	{
		const versionData = this.versionManager.activeVersionData();
		if (!versionData) {
			this.addError('The game data of this version is not loaded.');
			return;
		}
		const conversion = this.importer.convert(data, versionData);
		this.rowsSignal.update(rows => [...rows, {
			plan: conversion.plan,
			source: data,
			sourceVersion: sourceVersion ?? (this.ficsmas ? '1.0-ficsmas' : '1.0'),
			iconHash: this.planIcons.iconHash(conversion.plan),
			unknownCount: conversion.unknownClassNames.length,
			madeFor: sourceVersion === '0.8' ? 'Update 8' : null,
			selected: true,
		}]);
	}

	private addError(message: string): void
	{
		this.errorsSignal.update(errors => [...errors, message]);
	}

}
