import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronLeft} from '@fortawesome/free-solid-svg-icons';
import {forkJoin, of} from 'rxjs';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {ItemPickerComponent} from '@src/Components/Common/ItemPickerComponent';
import {ItemPickerOption} from '@src/Components/Common/ItemPickerOption';
import {PickedMod} from '@src/Components/Versions/PickedMod';
import {ModsApiService} from '@src/Model/API/ModsApiService';
import {Mod} from '@src/Model/API/Schema/Mods/Mod';
import {ModVersion} from '@src/Model/API/Schema/Mods/ModVersion';
import {Version} from '@src/Model/API/Schema/Version';
import {ItemForm} from '@src/Model/API/Schema/Data/Parts/ItemForm';
import {FrackingCoreCounts} from '@src/Model/API/Schema/World/FrackingCoreCounts';
import {PurityCounts} from '@src/Model/API/Schema/World/PurityCounts';
import {WorldDataMode} from '@src/Model/API/Schema/World/WorldDataMode';
import {WorldDataPayload} from '@src/Model/API/Schema/World/WorldDataPayload';
import {WorldDataPurity} from '@src/Model/API/Schema/World/WorldDataPurity';
import {VersionsApiService} from '@src/Model/API/VersionsApiService';
import {AuthService} from '@src/Model/Auth/AuthService';
import {Data} from '@src/Model/Data/Data';
import {DataTransformer} from '@src/Model/Data/DataTransformer';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {WorldLimitsCalculator} from '@src/Model/Data/WorldLimitsCalculator';
import {RateFormatter} from '@src/Model/RateFormatter';

/** One editable row of the world resource table. */
interface WorldResourceRow
{
	readonly className: string;
	readonly name: string;
	readonly iconHash: string | null;
	/** Solid resources use miner/belt rates, fluids extractor/pipe rates. */
	readonly solid: boolean;
	readonly hasNodes: boolean;
	readonly nodes: PurityCounts;
	readonly hasWells: boolean;
	cores: number;
	readonly satellites: PurityCounts;
	limit: number;
}

/** The seed/mode/purity that produced the current table. */
interface LoadedWorldSettings
{
	readonly seed: number;
	readonly mode: WorldDataMode;
	readonly purity: WorldDataPurity;
}

const SEED_MIN = -2147483648;
const SEED_MAX = 2147483647;
const EMPTY_COUNTS: PurityCounts = {impure: 0, normal: 0, pure: 0};

/**
 * Page for deriving a custom version from a public one: base version,
 * gameplay modifiers, mods, and world resource-node settings. Node counts
 * are loaded from the API for a seed/mode/purity and shown in an editable
 * table - editing counts recomputes the limit, editing a limit directly
 * just flags the mismatch. Whatever the table holds is echoed on create and
 * stored by the server under metadata.world.
 */
@Component({
	templateUrl: './CreateVersionPageComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, FormsModule, RouterLink, ItemPickerComponent, GameIconComponent],
	// The theme leaves Bootstrap's table text color dark - force the themed color.
	styles: `
		.table {
			--bs-table-color: var(--bs-body-color);
			--bs-table-bg: transparent;
		}
	`,
})
export class CreateVersionPageComponent
{

	public readonly faChevronLeft = faChevronLeft;

	/** The multiplier sets the server accepts (see custom-versions.md). */
	public readonly recipeCostOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
	public readonly powerCostOptions = [0.25, 0.5, 0.75, 1, 2, 5];

	public readonly worldModeOptions: {value: WorldDataMode; label: string}[] = [
		{value: 'none', label: 'Vanilla (no change)'},
		{value: 'random', label: 'Random'},
		{value: 'basic-rich', label: 'Basic rich'},
		{value: 'advanced-rich', label: 'Advanced rich'},
		{value: 'fossil-fuel-rich', label: 'Fossil fuel rich'},
	];
	public readonly worldPurityOptions: {value: WorldDataPurity; label: string}[] = [
		{value: 'no-change', label: 'No change'},
		{value: 'all-impure', label: 'All impure'},
		{value: 'decrease', label: 'Decrease'},
		{value: 'all-normal', label: 'All normal'},
		{value: 'increase', label: 'Increase'},
		{value: 'all-pure', label: 'All pure'},
		{value: 'all-random', label: 'All random'},
	];

	public baseId: string;
	public recipeCost = 1;
	public powerCost = 1;
	public name = '';
	public saving = false;
	public error: string | null = null;

	/** All mods visible to the user that have at least one version to merge. */
	public mods: Mod[] = [];
	public picked: PickedMod[] = [];

	// World settings. Changing them does NOT clear the table - the table
	// keeps the counts of the settings it was loaded from (loadedSettings),
	// and those are what get echoed on create.
	public worldSeed = 0;
	public worldMode: WorldDataMode = 'none';
	public worldPurity: WorldDataPurity = 'no-change';
	public worldLoading = false;
	public worldError: string | null = null;

	/** Checked = the table's counts and limits become directly editable. */
	public worldCustomise = false;

	public worldRows: WorldResourceRow[] = [];
	public worldGeysers: PurityCounts | null = null;
	private worldGameVersion = '';
	private loadedSettings: LoadedWorldSettings | null = null;
	/** Manual table edits since the last load - reloading asks before replacing them. */
	private worldDirty = false;

	/** The base version's game data, fetched for resource names/forms/icons; cached by dataPath. */
	private baseData: Data | null = null;
	private baseDataPath: string | null = null;

	public constructor(
		private readonly api: VersionsApiService,
		private readonly modsApi: ModsApiService,
		protected readonly auth: AuthService,
		protected readonly versionManager: VersionManager,
		private readonly transformer: DataTransformer,
		private readonly limitsCalculator: WorldLimitsCalculator,
		protected readonly formatter: RateFormatter,
		private readonly router: Router,
	)
	{
		this.baseId = this.baseVersions[0]?.id ?? '';
		this.modsApi.listMods().subscribe(mods => {
			this.mods = mods.filter(mod => mod.versions.length > 0);
		});
	}

	/** Only public versions qualify as a base - customs cannot derive from customs. */
	public get baseVersions(): Version[]
	{
		return this.versionManager.versions().filter(version => !version.custom);
	}

	/** Mods still addable (one version per mod, so picked ones drop out); non-public ones are labelled custom. */
	public get availableModOptions(): ItemPickerOption[]
	{
		const pickedIds = new Set(this.picked.map(entry => entry.mod.id));
		return this.mods
			.filter(mod => !pickedIds.has(mod.id))
			.map(mod => ({value: mod.id, label: mod.public ? mod.name : `${mod.name} (custom)`, iconHash: null}))
			.sort((a, b) => a.label.localeCompare(b.label));
	}

	public addMod(modId: string): void
	{
		const mod = this.mods.find(candidate => candidate.id === modId);
		if (mod && !this.picked.some(entry => entry.mod.id === modId)) {
			this.picked.push({mod, versionId: this.latestVersionOf(mod).id});
		}
	}

	public removeMod(index: number): void
	{
		this.picked.splice(index, 1);
	}

	private latestVersionOf(mod: Mod): ModVersion
	{
		// >= so same-second creations resolve to the later list entry (the API appends new versions).
		return mod.versions.reduce((latest, candidate) => candidate.createdAt >= latest.createdAt ? candidate : latest);
	}

	// ── World data ──────────────────────────────────────────────────────────

	public get worldSeedValid(): boolean
	{
		return Number.isInteger(this.worldSeed) && this.worldSeed >= SEED_MIN && this.worldSeed <= SEED_MAX;
	}

	/** A different base means different game data - the loaded table no longer applies. */
	public onBaseChanged(): void
	{
		this.baseData = null;
		this.baseDataPath = null;
		this.worldRows = [];
		this.worldGeysers = null;
		this.loadedSettings = null;
		this.worldDirty = false;
		this.worldError = null;
	}

	public loadWorldPreview(): void
	{
		if (this.worldLoading || !this.worldSeedValid) {
			return;
		}
		if (this.worldDirty && !confirm('Reload the node counts from the world settings? Your manual edits will be replaced.')) {
			return;
		}
		const base = this.baseVersions.find(version => version.id === this.baseId);
		if (!base) {
			return;
		}
		this.worldLoading = true;
		this.worldError = null;

		const settings: LoadedWorldSettings = {seed: this.worldSeed, mode: this.worldMode, purity: this.worldPurity};
		const baseData = this.baseData !== null && this.baseDataPath === base.dataPath
			? of(this.baseData)
			: this.api.loadVersionFile(base);

		forkJoin({
			preview: this.api.worldDataPreview(settings),
			file: baseData,
		}).subscribe({
			next: ({preview, file}) => {
				this.baseData = file instanceof Data ? file : this.transformer.transform(file);
				this.baseDataPath = base.dataPath;
				this.worldGameVersion = preview.gameVersion;
				this.worldGeysers = preview.geysers;
				this.loadedSettings = settings;
				this.worldDirty = false;

				const classNames = new Set([...Object.keys(preview.resourceNodes), ...Object.keys(preview.frackingCores)]);
				this.worldRows = [...classNames]
					.map(className => {
						const item = this.baseData?.searchItemByClassName(className);
						const nodes = preview.resourceNodes[className] ?? null;
						const well = preview.frackingCores[className] ?? null;
						const row: WorldResourceRow = {
							className,
							name: item?.name ?? className,
							iconHash: item?.icon ?? null,
							solid: (item?.form ?? ItemForm.Solid) === ItemForm.Solid,
							hasNodes: nodes !== null,
							nodes: {...(nodes ?? EMPTY_COUNTS)},
							hasWells: well !== null,
							cores: well?.cores ?? 0,
							satellites: {...(well?.satellites ?? EMPTY_COUNTS)},
							limit: 0,
						};
						row.limit = this.computedLimit(row);
						return row;
					})
					.sort((a, b) => a.name.localeCompare(b.name));
				this.worldLoading = false;
			},
			error: (err: {error?: {error?: string; detail?: string}}) => {
				this.worldLoading = false;
				this.worldError = err?.error?.detail ?? err?.error?.error ?? 'Could not load the node counts.';
			},
		});
	}

	/** Editing node counts recomputes the row's limit. */
	public onCountChange(row: WorldResourceRow): void
	{
		row.limit = this.computedLimit(row);
		this.worldDirty = true;
	}

	/** Editing a limit directly leaves the counts alone; the mismatch is flagged in the UI. */
	public onLimitChange(): void
	{
		this.worldDirty = true;
	}

	public limitMatches(row: WorldResourceRow): boolean
	{
		return row.limit === this.computedLimit(row);
	}

	private computedLimit(row: WorldResourceRow): number
	{
		return this.limitsCalculator.rowLimit(
			row.hasNodes ? row.nodes : null,
			row.hasWells ? row.satellites : null,
			row.solid,
		);
	}

	public countsText(counts: PurityCounts): string
	{
		return `${counts.impure} / ${counts.normal} / ${counts.pure}`;
	}

	public get geyserSummary(): string | null
	{
		return this.worldGeysers !== null ? this.countsText(this.worldGeysers) : null;
	}

	// ── Create ──────────────────────────────────────────────────────────────

	/** Whatever the (possibly edited) table holds is echoed to the server. */
	private worldDataPayload(): WorldDataPayload
	{
		const settings = this.loadedSettings ?? {seed: this.worldSeed, mode: this.worldMode, purity: this.worldPurity};
		const resourceNodes: Record<string, PurityCounts> = {};
		const frackingCores: Record<string, FrackingCoreCounts> = {};
		const limits: Record<string, number> = {};
		this.worldRows.forEach(row => {
			if (row.hasNodes) {
				resourceNodes[row.className] = {...row.nodes};
			}
			if (row.hasWells) {
				frackingCores[row.className] = {cores: row.cores, satellites: {...row.satellites}};
			}
			limits[row.className] = row.limit;
		});
		return {
			...settings,
			nodes: {
				gameVersion: this.worldGameVersion,
				...settings,
				resourceNodes,
				geysers: this.worldGeysers ?? {...EMPTY_COUNTS},
				frackingCores,
			},
			limits,
		};
	}

	public get canCreate(): boolean
	{
		return !this.saving && this.baseId !== ''
			&& (this.recipeCost !== 1 || this.powerCost !== 1 || this.picked.length > 0 || this.worldRows.length > 0);
	}

	/** Mirrors the server's default name so the empty name field shows what it will become. */
	public get namePlaceholder(): string
	{
		const base = this.baseVersions.find(version => version.id === this.baseId);
		if (!base) {
			return '';
		}
		const parts: string[] = [];
		if (this.recipeCost !== 1) {
			parts.push(`recipe ×${this.recipeCost}`);
		}
		if (this.powerCost !== 1) {
			parts.push(`power ×${this.powerCost}`);
		}
		if (this.picked.length > 0) {
			parts.push(`${this.picked.length} mod${this.picked.length === 1 ? '' : 's'}`);
		}
		if (this.worldRows.length > 0) {
			parts.push('modified resources');
		}
		return parts.length > 0 ? `${base.name} (${parts.join(', ')})` : base.name;
	}

	public create(): void
	{
		if (!this.canCreate) {
			return;
		}
		this.saving = true;
		this.error = null;

		const name = this.name.trim();
		const mods = this.picked.map(entry => entry.versionId);
		this.api.createVersion({
			base: this.baseId,
			recipeCost: this.recipeCost,
			powerCost: this.powerCost,
			...(name !== '' ? {name} : {}),
			...(mods.length > 0 ? {mods} : {}),
			...(this.worldRows.length > 0 ? {worldData: this.worldDataPayload()} : {}),
		}).subscribe({
			next: version => {
				this.versionManager.registerCreatedVersion(version);
				void this.router.navigate(['/', this.versionManager.urlSlug(version)]);
			},
			error: (err: {error?: {error?: string}}) => {
				this.saving = false;
				this.error = err?.error?.error ?? 'Could not create the custom version.';
			},
		});
	}

}
