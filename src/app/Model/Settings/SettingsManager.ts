import {Injectable, Optional, Signal, computed} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {filter, skip} from 'rxjs/operators';
import {AuthService} from '@src/Model/Auth/AuthService';
import {SettingsApiService} from '@src/Model/API/SettingsApiService';
import {DesktopBridge} from '@src/Model/Desktop/DesktopBridge';
import {ConnectivityService} from '@src/Model/Network/ConnectivityService';
import {NotificationService} from '@src/Model/NotificationService';
import {DataBackend} from '@src/Model/Sync/DataBackend';
import {OfflineMirrorBackend} from '@src/Model/Sync/OfflineMirrorBackend';
import {PreferLocalOfflineMerger} from '@src/Model/Sync/PreferLocalOfflineMerger';
import {LocalStorageDataBackend} from '@src/Model/Sync/LocalStorageDataBackend';
import {SyncableService} from '@src/Model/Sync/SyncableService';
import {PanelLayoutState} from '@src/Components/Planner/Panel/PanelLayoutState';
import {HotkeyOverrides} from '@src/Model/Hotkeys/HotkeyOverrides';
import {AccountSettings} from '@src/Model/Settings/AccountSettings';
import {GraphSettings} from '@src/Model/Settings/GraphSettings';
import {InteractiveSettingsConflictResolver} from '@src/Model/Settings/InteractiveSettingsConflictResolver';
import {NumberSettings} from '@src/Model/Settings/NumberSettings';
import {PlanDefaultsSettings} from '@src/Model/Settings/PlanDefaultsSettings';
import {PlannerSettings} from '@src/Model/Settings/PlannerSettings';
import {Settings} from '@src/Model/Settings/Settings';
import {SettingsApiDataBackend} from '@src/Model/Settings/SettingsApiDataBackend';
import {SettingsConflictService} from '@src/Model/Settings/SettingsConflictService';
import {SettingsDefaults} from '@src/Model/Settings/SettingsDefaults';
import {AppStorage} from '@src/Model/Storage/AppStorage';

@Injectable({providedIn: 'root'})
export class SettingsManager extends SyncableService<Settings>
{

	public readonly settings: Signal<Settings> = computed(() => SettingsDefaults.normalize(this.data()));
	public readonly numbers: Signal<NumberSettings> = computed(() => this.settings().numbers);
	public readonly graph: Signal<GraphSettings> = computed(() => this.settings().graph);
	public readonly planner: Signal<PlannerSettings> = computed(() => this.settings().planner);
	public readonly planDefaults: Signal<PlanDefaultsSettings> = computed(() => this.settings().planDefaults);
	public readonly account: Signal<AccountSettings> = computed(() => this.settings().account);
	public readonly hotkeys: Signal<HotkeyOverrides> = computed(() => this.settings().hotkeys);
	public readonly panels: Signal<PanelLayoutState | null> = computed(() => this.settings().panels);

	public constructor(
		authService: AuthService,
		settingsApiService: SettingsApiService,
		notifications: NotificationService,
		conflictService: SettingsConflictService,
		storage: AppStorage,
		connectivity: ConnectivityService,
		@Optional() desktop: DesktopBridge | null,
	)
	{
		const apiBackend = new SettingsApiDataBackend(settingsApiService, notifications, desktop !== null);
		// The desktop app keeps the account's settings while offline.
		const remoteBackend: DataBackend<Settings> = desktop === null ? apiBackend : new OfflineMirrorBackend<Settings>(
			apiBackend,
			apiBackend,
			storage,
			'settings',
			() => '',
			new PreferLocalOfflineMerger<Settings>(),
			connectivity,
			notifications,
			'settings',
		);
		super(
			authService,
			new LocalStorageDataBackend<Settings>(storage, 'sftools.settings'),
			remoteBackend,
			new InteractiveSettingsConflictResolver(conflictService),
			SettingsDefaults.SETTINGS,
			notifications,
			'settings',
		);

		// Back online: the reload is what sends the edits made offline.
		if (desktop !== null) {
			toObservable(connectivity.online).pipe(skip(1), filter(online => online)).subscribe(() => {
				if (authService.isAuthenticated()) {
					this.reload();
				}
			});
		}
	}

	public updateNumbers(patch: Partial<NumberSettings>): void
	{
		this.persist({...this.settings(), numbers: {...this.numbers(), ...patch}});
	}

	public updateGraph(patch: Partial<GraphSettings>): void
	{
		this.persist({...this.settings(), graph: {...this.graph(), ...patch}});
	}

	public updatePlanner(patch: Partial<PlannerSettings>): void
	{
		this.persist({...this.settings(), planner: {...this.planner(), ...patch}});
	}

	public updatePlanDefaults(patch: Partial<PlanDefaultsSettings>): void
	{
		this.persist({...this.settings(), planDefaults: {...this.planDefaults(), ...patch}});
	}

	public updateAccount(patch: Partial<AccountSettings>): void
	{
		this.persist({...this.settings(), account: {...this.account(), ...patch}});
	}

	/** Replaces rather than merges: a dropped entry (factory key) and null (no key) mean different things. */
	public updateHotkeys(hotkeys: HotkeyOverrides): void
	{
		this.persist({...this.settings(), hotkeys});
	}

	public updatePanels(panels: PanelLayoutState | null): void
	{
		this.persist({...this.settings(), panels});
	}

}
