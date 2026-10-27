import {Component, ChangeDetectionStrategy, computed, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, Signal, signal, HostListener} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {Subscription} from 'rxjs';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faTriangleExclamation} from '@fortawesome/free-solid-svg-icons';
import {HotkeyBlockDirective} from '@src/Components/Common/HotkeyBlockDirective';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {Version} from '@src/Model/API/Schema/Version';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {WorldSettingsLabels} from '@src/Model/Data/WorldSettingsLabels';
import {WorldVersionFinder} from '@src/Model/Data/WorldVersionFinder';
import {Game} from '@src/Model/Game/Game';
import {GameEditor} from '@src/Model/Game/GameEditor';
import {GameLabels} from '@src/Model/Game/GameLabels';
import {GameManager} from '@src/Model/Game/GameManager';
import {WorldNodesManager} from '@src/Model/Map/WorldNodesManager';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';
import {SaveFileService} from '@src/Model/SaveFile/SaveFileService';
import {SaveSettingsMapper} from '@src/Model/SaveFile/SaveSettingsMapper';
import {SaveSettingsMapResult} from '@src/Model/SaveFile/SaveSettingsMapResult';
import {SaveWorldMapper} from '@src/Model/SaveFile/SaveWorldMapper';
import {SaveWorldMapResult} from '@src/Model/SaveFile/SaveWorldMapResult';

type LoadFromSaveState = 'idle' | 'parsing' | 'ready' | 'error';

@Component({
	selector: 'load-from-save-dialog',
	templateUrl: './LoadFromSaveDialogComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, FormsModule, RouterLink, InfoNoteComponent, HotkeyBlockDirective],
	styles: `
		.save-backdrop {
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.5);
			z-index: 1070;
			display: flex;
			align-items: center;
			justify-content: center;
		}
		.save-dialog {
			width: min(560px, calc(100vw - 2rem));
			max-height: calc(100dvh - 2rem);
		}
		.save-dialog .card-body {
			overflow-y: auto;
		}
		.save-dialog input[type='file']::file-selector-button {
			background-color: #4e5d6c;
			color: #ebebeb;
			border: 0;
		}
	`,
})
export class LoadFromSaveDialogComponent implements OnInit, OnDestroy
{

	/** The plan or folder the unlocks go to; null when there is none, and only the map's parts can be loaded. */
	@Input() public targetName: string | null = null;
	/** Opened from the map: only the map's parts start ticked. */
	@Input() public mapOnly = false;
	/** Why the unlocks cannot be saved to the target; null when they can. */
	@Input() public planBlocker: string | null = null;
	/** Only the parts that were ticked: the target's settings may have changed while the dialog was open. */
	@Output() public readonly apply = new EventEmitter<Partial<PlanSettings> | null>();
	@Output() public readonly close = new EventEmitter<void>();

	@HostListener('document:keydown.escape')
	public onEscape(): void
	{
		this.close.emit();
	}


	public readonly faTriangleExclamation = faTriangleExclamation;

	public loadMachines = true;
	public loadRecipes = true;
	public loadGenerators = true;
	public loadTakenNodes = true;
	public loadCollected = true;
	public loadPlayers = true;
	/** For a save of another playthrough than the game the map has: replace that game, or keep both. */
	public gameChoice: 'replace' | 'new' = 'replace';

	/** A version without a map has nowhere to show taken nodes or players. */
	public readonly hasMap = computed(() => this.worldNodes.path() !== null);

	private readonly stateSignal = signal<LoadFromSaveState>('idle');
	public readonly state: Signal<LoadFromSaveState> = this.stateSignal.asReadonly();

	private readonly errorSignal = signal<string | null>(null);
	public readonly error: Signal<string | null> = this.errorSignal.asReadonly();

	private readonly resultSignal = signal<SaveSettingsMapResult | null>(null);
	public readonly result: Signal<SaveSettingsMapResult | null> = this.resultSignal.asReadonly();

	private readonly worldSignal = signal<SaveWorldMapResult | null>(null);
	public readonly world: Signal<SaveWorldMapResult | null> = this.worldSignal.asReadonly();

	public readonly saveWorldLabel = computed(() => {
		const world = this.worldSignal()?.world;
		return world === undefined ? '' : WorldSettingsLabels.describe(world);
	});

	public readonly versionWorldLabel = computed(() => {
		const nodes = this.worldNodes.nodes();
		return nodes === null ? '' : WorldSettingsLabels.describe({seed: nodes.seed ?? 0, mode: nodes.mode ?? 'none', purity: nodes.puritySettings ?? 'no-change'});
	});

	/** Where the save's world can be had: an existing version first, else the create page filled in. */
	public readonly matchingVersion = computed<Version | null>(() => {
		const world = this.worldSignal();
		return world?.sameWorld === false ? this.versionFinder.find(world.world) : null;
	});

	public readonly createParams = computed(() => {
		const world = this.worldSignal();
		return world?.sameWorld === false ? this.versionFinder.createParams(world.world) : null;
	});

	/** The game this save continues: loading it keeps the marks made on the map by hand. */
	public readonly continuedGame = computed<Game | null>(() => this.games.gameOfSave(this.worldSignal()?.saveIdentifier ?? null));

	/** The map's current game, when the save is of another one. */
	public readonly otherGame = computed<Game | null>(() => this.continuedGame() === null ? this.games.activeGame() : null);

	private parseSubscription: Subscription | null = null;

	public constructor(
		private readonly saveFileService: SaveFileService,
		private readonly mapper: SaveSettingsMapper,
		protected readonly versionManager: VersionManager,
		private readonly worldMapper: SaveWorldMapper,
		private readonly worldNodes: WorldNodesManager,
		private readonly versionFinder: WorldVersionFinder,
		private readonly games: GameManager,
		private readonly gameEditor: GameEditor,
		public readonly gameLabels: GameLabels,
		private readonly host: ElementRef<HTMLElement>,
	)
	{
	}

	public ngOnInit(): void
	{
		// Opened from inside a panel, it would stay below other panels: each one stacks on its own.
		document.body.append(this.host.nativeElement);
		if (this.mapOnly || !this.canLoadUnlocks()) {
			this.loadMachines = this.loadRecipes = this.loadGenerators = false;
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

		const data = this.versionManager.activeVersionData();
		if (!data) {
			this.errorSignal.set('The game data of this version is not loaded.');
			this.stateSignal.set('error');
			return;
		}

		this.stateSignal.set('parsing');
		this.errorSignal.set(null);
		this.resultSignal.set(null);
		this.worldSignal.set(null);
		this.parseSubscription?.unsubscribe();
		this.parseSubscription = this.saveFileService.parse(file).subscribe({
			next: contents => {
				this.resultSignal.set(this.mapper.map(contents.unlocks, data));
				this.worldSignal.set(this.worldMapper.map(contents.world, this.worldNodes.nodes()));
				this.stateSignal.set('ready');
			},
			error: (error: Error) => {
				this.errorSignal.set(error.message);
				this.stateSignal.set('error');
			},
		});
	}

	public canLoadUnlocks(): boolean
	{
		return this.targetName !== null && this.planBlocker === null;
	}

	public canApply(): boolean
	{
		return this.state() === 'ready' && (this.loadsUnlocks() || this.loadsMap());
	}

	private loadsUnlocks(): boolean
	{
		return this.canLoadUnlocks() && (this.loadMachines || this.loadRecipes || this.loadGenerators);
	}

	private loadsMap(): boolean
	{
		return this.hasMap() && (this.loadTakenNodes || this.loadCollected || this.loadPlayers);
	}

	public applySettings(): void
	{
		const result = this.result();
		const world = this.world();
		if (!result || world === null || !this.canApply()) {
			return;
		}
		if (this.loadsMap()) {
			const continued = this.continuedGame();
			this.gameEditor.importSave({
				saveIdentifier: world.saveIdentifier,
				sessionName: result.summary.sessionName,
				takenNodes: this.loadTakenNodes ? world.takenNodes : null,
				collected: this.loadCollected ? world.collected : null,
				players: this.loadPlayers ? world.players : null,
			}, continued ?? (this.gameChoice === 'replace' ? this.otherGame() : null), continued !== null ? 'update' : 'replace');
		}
		this.apply.emit(this.loadsUnlocks() ? {
			...(this.loadRecipes ? {enabledRecipes: result.enabledRecipes} : {}),
			...(this.loadMachines ? {disabledMachines: result.disabledMachines} : {}),
			...(this.loadGenerators ? {enabledFuels: result.enabledFuels} : {}),
		} : null);
	}

	public ngOnDestroy(): void
	{
		this.host.nativeElement.remove();
		this.parseSubscription?.unsubscribe();
	}

}
