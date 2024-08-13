import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronLeft} from '@fortawesome/free-solid-svg-icons';
import {ModEntryFormComponent} from '@src/Components/ModEditor/ModEntryFormComponent';
import {ModsApiService} from '@src/Model/API/ModsApiService';
import {DataSchema} from '@src/Model/API/Schema/Data/DataSchema';
import {Mod} from '@src/Model/API/Schema/Mods/Mod';
import {ModVersion} from '@src/Model/API/Schema/Mods/ModVersion';
import {ModDataValidator} from '@src/Model/ModEditor/ModDataValidator';
import {ModEntryDescriptor} from '@src/Model/ModEditor/ModEntryDescriptor';
import {ModImageStore} from '@src/Model/ModEditor/ModImageStore';
import {ModSchemaDescriptors} from '@src/Model/ModEditor/ModSchemaDescriptors';

/**
 * Editor for one mod version's data: builds a JSON document in the Data
 * schema format whose entries the API merges into a base version by
 * className. Two ways in - the clickable entry forms, or pasting JSON
 * (validated against the schema before it replaces the working data).
 *
 * Routed two ways: bound to a mod version (/mods/:modId/versions/:id/data),
 * where it loads the uploaded data and saves back through the API, or
 * standalone at /mod-editor as a scratchpad that only produces JSON.
 */
@Component({
	templateUrl: './ModEditorComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, FormsModule, RouterLink, ModEntryFormComponent],
	host: {class: 'container-fluid d-block my-4', style: 'max-width: 1100px;'},
})
export class ModEditorComponent
{

	public readonly faChevronLeft = faChevronLeft;

	public readonly descriptors = ModSchemaDescriptors.ALL;

	public data: DataSchema = ModSchemaDescriptors.emptyData();
	/**
	 * The wrapper metadata of the version file. Mod data files use the FULL
	 * game-version file format `{data, metadata}` - the server merges from
	 * the `data` key and merges `metadata` shallowly; a bare data document
	 * would silently merge nothing. The editor doesn't edit metadata, it just
	 * round-trips whatever was loaded.
	 */
	public metadata: Record<string, unknown> = {};

	public activeTab: 'editor' | 'json' = 'editor';
	/** A collection key, or the two special sections. */
	public activeSection: string = 'items';

	public newClassName = '';
	public addError: string | null = null;
	/** `${collection}:${className}` of the expanded entry; only one open at a time. */
	public expandedEntry: string | null = null;

	public newResource = '';

	public pastedJson = '';
	public pasteErrors: string[] = [];
	public pasteMessage: string | null = null;

	/** Set when the editor is bound to a mod version (loaded from and saved to the API). */
	public readonly modId: string | null;
	public readonly modVersionId: string | null;
	public mod: Mod | null = null;
	public modVersion: ModVersion | null = null;
	public loadState: 'loading' | 'ready' | 'error' = 'ready';
	public saveState: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
	public saveError: string | null = null;
	/** Problems found in data loaded from the server (kept editable regardless). */
	public loadWarnings: string[] = [];

	public constructor(
		private readonly validator: ModDataValidator,
		private readonly modsApi: ModsApiService,
		protected readonly imageStore: ModImageStore,
		route: ActivatedRoute,
	)
	{
		this.modId = route.snapshot.paramMap.get('modId');
		this.modVersionId = route.snapshot.paramMap.get('modVersionId');
		if (this.modId !== null && this.modVersionId !== null) {
			this.loadModVersion(this.modId, this.modVersionId);
		}
	}

	public get isBound(): boolean
	{
		return this.modVersionId !== null;
	}

	private loadModVersion(modId: string, modVersionId: string): void
	{
		this.loadState = 'loading';
		this.modsApi.getMod(modId).subscribe({
			next: mod => {
				this.mod = mod;
				this.modVersion = mod.versions.find(version => version.id === modVersionId) ?? null;
				if (!this.modVersion || !mod.owned) {
					this.loadState = 'error';
					return;
				}
				if (this.modVersion.hasData) {
					this.loadModVersionData(modVersionId);
				} else {
					this.loadState = 'ready';
				}
			},
			error: () => this.loadState = 'error',
		});
	}

	private loadModVersionData(modVersionId: string): void
	{
		this.modsApi.getModVersionData(modVersionId).subscribe({
			next: loaded => {
				const file = this.unwrapVersionFile(loaded);
				this.loadWarnings = this.validator.validate(file.data);
				this.data = {...ModSchemaDescriptors.emptyData(), ...(file.data as Partial<DataSchema>)};
				this.metadata = file.metadata;
				this.loadState = 'ready';
			},
			error: () => this.loadState = 'error',
		});
	}

	/**
	 * Splits a loaded/pasted document into data + metadata, accepting both
	 * the full version-file format and a bare data document.
	 */
	private unwrapVersionFile(parsed: unknown): {data: unknown; metadata: Record<string, unknown>}
	{
		if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
			const record = parsed as Record<string, unknown>;
			const isWrapper = typeof record['data'] === 'object' && record['data'] !== null
				&& Object.keys(record).every(key => key === 'data' || key === 'metadata');
			if (isWrapper) {
				const metadata = record['metadata'];
				return {
					data: record['data'],
					metadata: typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata)
						? metadata as Record<string, unknown>
						: {},
				};
			}
		}
		return {data: parsed, metadata: {}};
	}

	public save(): void
	{
		if (this.modId === null || this.modVersionId === null || this.saveState === 'saving') {
			return;
		}
		this.saveState = 'saving';
		this.saveError = null;
		this.modsApi.updateModVersion(this.modId, this.modVersionId, {data: {data: this.data, metadata: this.metadata}}).subscribe({
			next: version => {
				this.modVersion = version;
				this.saveState = 'saved';
			},
			error: (err: {error?: {error?: string}}) => {
				this.saveState = 'error';
				this.saveError = err?.error?.error ?? 'Could not save the mod data.';
			},
		});
	}

	public get activeDescriptor(): ModEntryDescriptor | null
	{
		return this.descriptors.find(descriptor => descriptor.collection === this.activeSection) ?? null;
	}

	public setSection(section: string): void
	{
		this.activeSection = section;
		this.newClassName = '';
		this.addError = null;
		this.expandedEntry = null;
	}

	public collectionOf(descriptor: ModEntryDescriptor): Record<string, Record<string, unknown>>
	{
		return this.data[descriptor.collection] as unknown as Record<string, Record<string, unknown>>;
	}

	public entryKeys(descriptor: ModEntryDescriptor): string[]
	{
		return Object.keys(this.collectionOf(descriptor));
	}

	public entryCount(descriptor: ModEntryDescriptor): number
	{
		return this.entryKeys(descriptor).length;
	}

	public entryName(descriptor: ModEntryDescriptor, key: string): string
	{
		const name = this.collectionOf(descriptor)[key]?.['name'];
		return typeof name === 'string' && name !== '' ? name : '';
	}

	public addEntry(descriptor: ModEntryDescriptor): void
	{
		const className = this.newClassName.trim();
		this.addError = null;
		if (className === '') {
			this.addError = 'Enter a className first.';
			return;
		}
		if (this.collectionOf(descriptor)[className] !== undefined) {
			this.addError = `"${className}" already exists in ${descriptor.label.toLowerCase()}.`;
			return;
		}
		this.collectionOf(descriptor)[className] = ModSchemaDescriptors.createDefault(descriptor, className);
		this.newClassName = '';
		this.expandedEntry = `${descriptor.collection}:${className}`;
	}

	public removeEntry(descriptor: ModEntryDescriptor, key: string): void
	{
		if (!confirm(`Delete ${descriptor.singular} "${key}" from the mod?`)) {
			return;
		}
		delete this.collectionOf(descriptor)[key];
		if (this.expandedEntry === `${descriptor.collection}:${key}`) {
			this.expandedEntry = null;
		}
	}

	public toggleExpand(descriptor: ModEntryDescriptor, key: string): void
	{
		const id = `${descriptor.collection}:${key}`;
		this.expandedEntry = this.expandedEntry === id ? null : id;
	}

	public isExpanded(descriptor: ModEntryDescriptor, key: string): boolean
	{
		return this.expandedEntry === `${descriptor.collection}:${key}`;
	}

	public addResource(): void
	{
		const className = this.newResource.trim();
		if (className !== '' && !this.data.resources.includes(className)) {
			this.data.resources.push(className);
		}
		this.newResource = '';
	}

	public removeResource(index: number): void
	{
		this.data.resources.splice(index, 1);
	}

	public onImagePicked(event: Event): void
	{
		const input = event.target as HTMLInputElement;
		Array.from(input.files ?? []).forEach(file => this.imageStore.add(file));
		input.value = '';
	}

	/** The full document as saved/uploaded: the version-file wrapper around the edited data. */
	public get generatedJson(): string
	{
		return JSON.stringify({data: this.data, metadata: this.metadata}, null, '\t');
	}

	public copyJson(): void
	{
		void navigator.clipboard.writeText(this.generatedJson);
	}

	public downloadJson(): void
	{
		const blob = new Blob([this.generatedJson], {type: 'application/json'});
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = 'mod-data.json';
		anchor.click();
		URL.revokeObjectURL(url);
	}

	/** Accepts both the full version-file format and a bare data document. */
	public validatePasted(): {data: unknown; metadata: Record<string, unknown>} | null
	{
		this.pasteMessage = null;
		let parsed: unknown;
		try {
			parsed = JSON.parse(this.pastedJson);
		} catch (err) {
			this.pasteErrors = ['Not valid JSON: ' + String(err instanceof Error ? err.message : err)];
			return null;
		}
		const file = this.unwrapVersionFile(parsed);
		this.pasteErrors = this.validator.validate(file.data);
		if (this.pasteErrors.length === 0) {
			this.pasteMessage = 'Valid - fits the Data schema.';
			return file;
		}
		return null;
	}

	/** Replaces the working data with the pasted document (missing collections become empty). */
	public loadPasted(): void
	{
		const file = this.validatePasted();
		if (file === null) {
			return;
		}
		this.data = {...ModSchemaDescriptors.emptyData(), ...(file.data as Partial<DataSchema>)};
		this.metadata = file.metadata;
		this.pasteMessage = 'Loaded into the editor.';
		this.expandedEntry = null;
		this.activeTab = 'editor';
	}

}
