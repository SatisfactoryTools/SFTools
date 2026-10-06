import {Injectable} from '@angular/core';
import {OldGameVersion} from '@src/Model/OldTools/OldGameVersion';
import {OldLocalProductionLine} from '@src/Model/OldTools/OldLocalProductionLine';
import {OldProductionData} from '@src/Model/OldTools/OldProductionData';
import {AppStorage} from '@src/Model/Storage/AppStorage';

const COPIED_KEY = 'sftools.oldTools.copied';

interface CopiedFlags
{
	regular?: number;
	ficsmas?: number;
}

@Injectable({providedIn: 'root'})
export class OldToolsLocalStorageService
{

	private static readonly KEYS: ReadonlyArray<{key: string; gameVersion: OldGameVersion}> = [
		{key: 'production1', gameVersion: '1.0'},
		{key: 'production-ficsmas', gameVersion: '1.0-ficsmas'},
		{key: 'tmpProduction', gameVersion: '0.8'},
	];

	public constructor(private readonly storage: AppStorage)
	{
	}

	public readAll(): OldLocalProductionLine[]
	{
		return OldToolsLocalStorageService.KEYS.flatMap(({key, gameVersion}) => this.read(key).map(data => ({data, gameVersion})));
	}

	public readFlavour(ficsmas: boolean): OldLocalProductionLine[]
	{
		return this.readAll().filter(line => (line.gameVersion === '1.0-ficsmas') === ficsmas);
	}

	public count(): number
	{
		return this.readAll().length;
	}

	public copied(ficsmas: boolean): boolean
	{
		return this.flags()[ficsmas ? 'ficsmas' : 'regular'] !== undefined;
	}

	public markCopied(ficsmas: boolean): void
	{
		const flags = this.flags();
		flags[ficsmas ? 'ficsmas' : 'regular'] = Date.now();
		this.storage.setItem(COPIED_KEY, JSON.stringify(flags));
	}

	private flags(): CopiedFlags
	{
		try {
			const raw = this.storage.getItem(COPIED_KEY);
			return raw === null ? {} : (JSON.parse(raw) as CopiedFlags);
		} catch {
			return {};
		}
	}

	private read(key: string): OldProductionData[]
	{
		try {
			// Raw localStorage, not AppStorage: only the old site wrote these keys (the desktop app's storage never has them).
			const raw = localStorage.getItem(key);
			if (raw === null) {
				return [];
			}
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
