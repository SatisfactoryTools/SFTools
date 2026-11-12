import {PickedMod} from '@src/Components/Versions/PickedMod';
import {Mod} from '@src/Model/API/Schema/Mods/Mod';
import {ModVersion} from '@src/Model/API/Schema/Mods/ModVersion';

export class ModSelection
{

	private readonly entries: PickedMod[] = [];
	private readonly unavailable = new Set<string>();

	public constructor(private readonly mods: Mod[])
	{
	}

	public get picked(): PickedMod[]
	{
		return this.entries;
	}

	public get modsWithHiddenDependencies(): string[]
	{
		return [...this.unavailable];
	}

	public add(mod: Mod, versionId: string): void
	{
		if (this.entries.some(entry => entry.mod.id === mod.id)) {
			return;
		}
		this.entries.push({mod, versionId});
		this.update();
	}

	public changeVersion(entry: PickedMod, versionId: string): void
	{
		entry.versionId = versionId;
		this.update();
	}

	public remove(entry: PickedMod): void
	{
		const index = this.entries.indexOf(entry);
		if (index < 0 || this.neededBy(entry).length > 0) {
			return;
		}
		this.entries.splice(index, 1);
		this.update();
	}

	public neededBy(entry: PickedMod): Mod[]
	{
		return this.entries
			.filter(other => other !== entry && this.dependencyMods(other).some(mod => mod.id === entry.mod.id))
			.map(other => other.mod);
	}

	private update(): void
	{
		this.unavailable.clear();
		let added = true;
		while (added) {
			added = false;
			for (const entry of [...this.entries]) {
				for (const dependencyId of this.versionOf(entry)?.dependencies ?? []) {
					const owner = this.ownerOf(dependencyId);
					if (owner === undefined) {
						this.unavailable.add(entry.mod.name);
					} else if (!this.entries.some(picked => picked.mod.id === owner.id)) {
						this.entries.push({mod: owner, versionId: dependencyId});
						added = true;
					}
				}
			}
		}
		this.sort();
	}

	// Later mods overwrite earlier ones, so every mod goes after the mods it needs; otherwise the picked order stays.
	private sort(): void
	{
		const remaining = [...this.entries];
		const placed = new Set<string>();
		this.entries.length = 0;
		while (remaining.length > 0) {
			const readyIndex = remaining.findIndex(entry => this.dependencyMods(entry).every(mod => placed.has(mod.id)));
			const [next] = remaining.splice(Math.max(0, readyIndex), 1);
			this.entries.push(next);
			placed.add(next.mod.id);
		}
	}

	private dependencyMods(entry: PickedMod): Mod[]
	{
		return (this.versionOf(entry)?.dependencies ?? [])
			.map(dependencyId => this.ownerOf(dependencyId))
			.filter((mod): mod is Mod => mod !== undefined);
	}

	private versionOf(entry: PickedMod): ModVersion | undefined
	{
		return entry.mod.versions.find(version => version.id === entry.versionId);
	}

	private ownerOf(versionId: string): Mod | undefined
	{
		return this.mods.find(mod => mod.versions.some(version => version.id === versionId));
	}

}
