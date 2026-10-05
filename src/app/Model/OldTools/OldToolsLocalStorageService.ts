import {Injectable, Signal, signal} from '@angular/core';
import {OldGameVersion} from '@src/Model/OldTools/OldGameVersion';
import {OldLocalProductionLine} from '@src/Model/OldTools/OldLocalProductionLine';
import {OldProductionData} from '@src/Model/OldTools/OldProductionData';

const PROMPT_DISMISSED_KEY = 'sftools.oldTools.localPromptDismissed';

/**
 * Reads the production lines the old Satisfactory Tools kept in localStorage.
 * Once this app is served from the old site's domain, that data is right here
 * in the same origin - one key per game version, each a JSON array of lines.
 * The keys are never removed: the old data is small, and deleting it would
 * turn a failed import into a lost factory.
 */
@Injectable({providedIn: 'root'})
export class OldToolsLocalStorageService
{

	private static readonly KEYS: ReadonlyArray<{key: string; gameVersion: OldGameVersion}> = [
		{key: 'production1', gameVersion: '1.0'},
		{key: 'production-ficsmas', gameVersion: '1.0-ficsmas'},
		{key: 'tmpProduction', gameVersion: '0.8'},
	];

	private readonly promptDismissedSignal = signal(localStorage.getItem(PROMPT_DISMISSED_KEY) !== null);
	/** The user closed the "old plans found" offer (or imported them) - do not offer again. */
	public readonly promptDismissed: Signal<boolean> = this.promptDismissedSignal.asReadonly();

	public readAll(): OldLocalProductionLine[]
	{
		return OldToolsLocalStorageService.KEYS.flatMap(({key, gameVersion}) => this.read(key).map(data => ({data, gameVersion})));
	}

	/** Lines made for a FICSMAS or a regular version; Update 8 lines count as regular. */
	public readFlavour(ficsmas: boolean): OldLocalProductionLine[]
	{
		return this.readAll().filter(line => (line.gameVersion === '1.0-ficsmas') === ficsmas);
	}

	public count(): number
	{
		return this.readAll().length;
	}

	public dismissPrompt(): void
	{
		localStorage.setItem(PROMPT_DISMISSED_KEY, String(Date.now()));
		this.promptDismissedSignal.set(true);
	}

	private read(key: string): OldProductionData[]
	{
		const raw = localStorage.getItem(key);
		if (raw === null) {
			return [];
		}
		try {
			const parsed: unknown = JSON.parse(raw);
			if (!Array.isArray(parsed)) {
				return [];
			}
			return (parsed as OldProductionData[]).filter(line => !!line?.metadata && !!line?.request);
		} catch {
			return [];
		}
	}

}
