import {Observable, of} from 'rxjs';
import {ConflictResolution} from '@src/Model/Sync/ConflictResolution';
import {ConflictResolver} from '@src/Model/Sync/ConflictResolver';
import {Settings} from '@src/Model/Settings/Settings';
import {SettingsConflictService} from '@src/Model/Settings/SettingsConflictService';
import {SettingsDefaults} from '@src/Model/Settings/SettingsDefaults';

/**
 * On login, if this device's preferences differ from the account's, ask the
 * user which to keep. Only the visible preferences (numbers, graph) count -
 * the panel layout is device-specific and never triggers a prompt.
 */
export class InteractiveSettingsConflictResolver implements ConflictResolver<Settings>
{

	public constructor(private readonly service: SettingsConflictService)
	{
	}

	public resolve({local, remote}: ConflictResolution<Settings>): Observable<Settings>
	{
		const normalizedLocal = SettingsDefaults.normalize(local);
		const normalizedRemote = SettingsDefaults.normalize(remote);
		if (this.samePreferences(normalizedLocal, normalizedRemote)) {
			return of(normalizedLocal);
		}
		return this.service.present({local: normalizedLocal, remote: normalizedRemote});
	}

	private samePreferences(a: Settings, b: Settings): boolean
	{
		return JSON.stringify({numbers: a.numbers, graph: a.graph})
			=== JSON.stringify({numbers: b.numbers, graph: b.graph});
	}

}
