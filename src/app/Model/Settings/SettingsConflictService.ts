import {Injectable, Signal, signal} from '@angular/core';
import {Observable} from 'rxjs';
import {Settings} from '@src/Model/Settings/Settings';
import {SettingsConflict} from '@src/Model/Settings/SettingsConflict';

/**
 * Bridges the settings conflict resolver and the dialog that shows it: the
 * resolver `present()`s a conflict (exposing it as a signal for the dialog),
 * and the dialog calls `acceptLocal`/`acceptRemote` to complete the choice.
 */
@Injectable({providedIn: 'root'})
export class SettingsConflictService
{

	private readonly conflictSignal = signal<SettingsConflict | null>(null);
	public readonly conflict: Signal<SettingsConflict | null> = this.conflictSignal.asReadonly();

	private resolveFn: ((chosen: Settings) => void) | null = null;

	/** Shows the conflict and resolves once the user picks a side. */
	public present(conflict: SettingsConflict): Observable<Settings>
	{
		return new Observable<Settings>(subscriber => {
			this.conflictSignal.set(conflict);
			this.resolveFn = chosen => {
				this.conflictSignal.set(null);
				this.resolveFn = null;
				subscriber.next(chosen);
				subscriber.complete();
			};
		});
	}

	public acceptLocal(): void
	{
		const conflict = this.conflictSignal();
		this.resolveFn?.(conflict!.local);
	}

	public acceptRemote(): void
	{
		const conflict = this.conflictSignal();
		this.resolveFn?.(conflict!.remote);
	}

}
