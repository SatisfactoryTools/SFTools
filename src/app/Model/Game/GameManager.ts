import {computed, Injectable, Optional, Signal} from '@angular/core';
import {GamesApiService} from '@src/Model/API/GamesApiService';
import {AuthService} from '@src/Model/Auth/AuthService';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {DesktopBridge} from '@src/Model/Desktop/DesktopBridge';
import {Game} from '@src/Model/Game/Game';
import {GameSaveImport} from '@src/Model/Game/GameSaveImport';
import {GamesApiDataBackend} from '@src/Model/Game/GamesApiDataBackend';
import {GameStore} from '@src/Model/Game/GameStore';
import {MergeGamesConflictResolver} from '@src/Model/Game/MergeGamesConflictResolver';
import {ConnectivityService} from '@src/Model/Network/ConnectivityService';
import {NotificationService} from '@src/Model/NotificationService';
import {AppStorage} from '@src/Model/Storage/AppStorage';
import {DataBackend} from '@src/Model/Sync/DataBackend';
import {LocalStorageDataBackend} from '@src/Model/Sync/LocalStorageDataBackend';
import {OfflineMirrorBackend} from '@src/Model/Sync/OfflineMirrorBackend';
import {PreferLocalOfflineMerger} from '@src/Model/Sync/PreferLocalOfflineMerger';
import {SyncableService} from '@src/Model/Sync/SyncableService';

/** The games loaded from save files. Most people have one per version and never see more than "loaded from your save". */
@Injectable({providedIn: 'root'})
export class GameManager extends SyncableService<GameStore>
{

	private static readonly EMPTY: GameStore = {games: [], active: {}};

	private readonly versionId = computed(() => this.versionManager.activeVersion()?.id ?? null);

	public readonly games: Signal<Game[]> = computed(() => {
		const versionId = this.versionId();
		return (this.data().games ?? []).filter(game => game.versionId === versionId);
	});

	public readonly activeGame: Signal<Game | null> = computed(() => {
		const games = this.games();
		const versionId = this.versionId();
		const activeId = versionId === null ? undefined : this.data().active?.[versionId];
		return games.find(game => game.id === activeId) ?? games[0] ?? null;
	});

	public readonly taken: Signal<ReadonlySet<string>> = computed(() => {
		const game = this.activeGame();
		return game === null ? new Set() : GameManager.marked(game.takenNodes, game.takenMarks);
	});

	public readonly collected: Signal<ReadonlySet<string>> = computed(() => {
		const game = this.activeGame();
		return game === null ? new Set() : GameManager.marked(game.collected, game.collectedMarks);
	});

	public constructor(
		authService: AuthService,
		api: GamesApiService,
		notifications: NotificationService,
		storage: AppStorage,
		connectivity: ConnectivityService,
		private readonly versionManager: VersionManager,
		@Optional() desktop: DesktopBridge | null,
	)
	{
		const apiBackend = new GamesApiDataBackend(api, notifications, desktop !== null);
		const remoteBackend: DataBackend<GameStore> = desktop === null ? apiBackend : new OfflineMirrorBackend<GameStore>(
			apiBackend,
			apiBackend,
			storage,
			'games',
			() => '',
			new PreferLocalOfflineMerger<GameStore>(),
			connectivity,
			notifications,
			'game',
		);
		super(
			authService,
			new LocalStorageDataBackend<GameStore>(storage, 'sftools.games'),
			remoteBackend,
			new MergeGamesConflictResolver(),
			GameManager.EMPTY,
			notifications,
			'game',
		);
	}

	private static marked(names: string[], marks: Record<string, boolean>): ReadonlySet<string>
	{
		const result = new Set(names);
		for (const [name, on] of Object.entries(marks ?? {})) {
			if (on) {
				result.add(name);
			} else {
				result.delete(name);
			}
		}
		return result;
	}

	/** A mark the save now agrees with has done its job. */
	private static prune(marks: Record<string, boolean>, names: string[]): Record<string, boolean>
	{
		const set = new Set(names);
		return Object.fromEntries(Object.entries(marks ?? {}).filter(([name, on]) => set.has(name) !== on));
	}

	/** The active version's game that the save continues, if any. */
	public gameOfSave(saveIdentifier: string | null): Game | null
	{
		return saveIdentifier === null ? null : this.games().find(game => game.saveIdentifier === saveIdentifier) ?? null;
	}

	/**
	 * `update` continues a game (its hand-made marks stay), `replace` puts another playthrough in its place,
	 * `null` adds the save as a game of its own.
	 */
	public importSave(save: GameSaveImport, into: Game | null, mode: 'update' | 'replace'): Game | null
	{
		const versionId = this.versionId();
		if (versionId === null) {
			return null;
		}
		const base: Game = into ?? {
			id: crypto.randomUUID(), versionId, saveIdentifier: null, sessionName: null, loadedAt: '',
			takenNodes: [], collected: [], players: [], takenMarks: {}, collectedMarks: {},
		};
		const keepMarks = into !== null && mode === 'update';
		const takenNodes = save.takenNodes ?? base.takenNodes;
		const collected = save.collected ?? base.collected;
		const game: Game = {
			...base,
			saveIdentifier: save.saveIdentifier,
			sessionName: save.sessionName,
			loadedAt: new Date().toISOString(),
			takenNodes,
			collected,
			players: save.players ?? base.players,
			takenMarks: keepMarks ? GameManager.prune(base.takenMarks, takenNodes) : {},
			collectedMarks: keepMarks ? GameManager.prune(base.collectedMarks, collected) : {},
		};
		const store = this.data();
		this.persist({
			games: [...(store.games ?? []).filter(existing => existing.id !== game.id), game],
			active: {...store.active, [versionId]: game.id},
		});
		return game;
	}

	public setTaken(name: string, taken: boolean): void
	{
		this.updateActive(game => ({...game, takenMarks: this.mark(game.takenMarks, game.takenNodes, name, taken)}));
	}

	public setCollected(name: string, collected: boolean): void
	{
		this.updateActive(game => ({...game, collectedMarks: this.mark(game.collectedMarks, game.collected, name, collected)}));
	}

	public select(id: string): void
	{
		const versionId = this.versionId();
		if (versionId !== null && this.games().some(game => game.id === id)) {
			const store = this.data();
			this.persist({...store, active: {...store.active, [versionId]: id}});
		}
	}

	public remove(id: string): void
	{
		const store = this.data();
		const active = Object.fromEntries(Object.entries(store.active ?? {}).filter(([, gameId]) => gameId !== id));
		this.persist({games: (store.games ?? []).filter(game => game.id !== id), active});
	}

	/** A game made by hand marks alone: someone who marks a node before loading any save. */
	private updateActive(change: (game: Game) => Game): void
	{
		const game = this.activeGame() ?? this.importSave({saveIdentifier: null, sessionName: null, takenNodes: null, collected: null, players: null}, null, 'update');
		if (game === null) {
			return;
		}
		const store = this.data();
		const updated = change(game);
		this.persist({...store, games: (store.games ?? []).map(existing => existing.id === updated.id ? updated : existing)});
	}

	private mark(marks: Record<string, boolean>, names: string[], name: string, on: boolean): Record<string, boolean>
	{
		const result = {...marks};
		if (names.includes(name) === on) {
			delete result[name];
		} else {
			result[name] = on;
		}
		return result;
	}

}
