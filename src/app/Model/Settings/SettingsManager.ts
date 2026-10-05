import {Injectable, Signal, computed} from '@angular/core';
import {AuthService} from '@src/Model/Auth/AuthService';
import {SettingsApiService} from '@src/Model/API/SettingsApiService';
import {NotificationService} from '@src/Model/NotificationService';
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

/** Persisted like plans (localStorage when logged out, the API once authenticated); every field is defaulted on read so partial or legacy payloads never surface undefined. */
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
	)
	{
		super(
			authService,
			new LocalStorageDataBackend<Settings>('sftools.settings'),
			new SettingsApiDataBackend(settingsApiService, notifications),
			new InteractiveSettingsConflictResolver(conflictService),
			SettingsDefaults.SETTINGS,
			notifications,
			'settings',
		);
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

	/** Replaces all overrides - the caller decides, since a dropped entry (factory key) and null (no key) mean different things. */
	public updateHotkeys(hotkeys: HotkeyOverrides): void
	{
		this.persist({...this.settings(), hotkeys});
	}

	public updatePanels(panels: PanelLayoutState | null): void
	{
		this.persist({...this.settings(), panels});
	}

}
