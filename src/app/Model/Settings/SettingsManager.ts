import {Injectable, Signal, computed} from '@angular/core';
import {AuthService} from '@src/Model/Auth/AuthService';
import {SettingsApiService} from '@src/Model/API/SettingsApiService';
import {NotificationService} from '@src/Model/NotificationService';
import {LocalStorageDataBackend} from '@src/Model/Sync/LocalStorageDataBackend';
import {SyncableService} from '@src/Model/Sync/SyncableService';
import {PanelLayoutState} from '@src/Components/Planner/Panel/PanelLayoutState';
import {GraphSettings} from '@src/Model/Settings/GraphSettings';
import {InteractiveSettingsConflictResolver} from '@src/Model/Settings/InteractiveSettingsConflictResolver';
import {NumberSettings} from '@src/Model/Settings/NumberSettings';
import {Settings} from '@src/Model/Settings/Settings';
import {SettingsApiDataBackend} from '@src/Model/Settings/SettingsApiDataBackend';
import {SettingsConflictService} from '@src/Model/Settings/SettingsConflictService';
import {SettingsDefaults} from '@src/Model/Settings/SettingsDefaults';

/**
 * Global, user-scoped settings, persisted exactly like plans: to localStorage
 * while logged out and to the settings API once authenticated (the base class
 * migrates local edits up on login). Every field is defaulted on read, so
 * partial or legacy payloads never surface undefined values.
 */
@Injectable({providedIn: 'root'})
export class SettingsManager extends SyncableService<Settings>
{

	public readonly settings: Signal<Settings> = computed(() => SettingsDefaults.normalize(this.data()));
	public readonly numbers: Signal<NumberSettings> = computed(() => this.settings().numbers);
	public readonly graph: Signal<GraphSettings> = computed(() => this.settings().graph);
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

	/** Replaces the remembered panel layout; null resets it to the defaults. */
	public updatePanels(panels: PanelLayoutState | null): void
	{
		this.persist({...this.settings(), panels});
	}

}
