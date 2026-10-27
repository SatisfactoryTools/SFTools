import {Injectable} from '@angular/core';
import {Params} from '@angular/router';
import {Version} from '@src/Model/API/Schema/Version';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {WorldSettings} from '@src/Model/Data/WorldSettings';
import {WorldSettingsLabels} from '@src/Model/Data/WorldSettingsLabels';

/** A version like the active one, but with another world: the same base, multipliers and mods. */
@Injectable({providedIn: 'root'})
export class WorldVersionFinder
{

	public constructor(private readonly versionManager: VersionManager)
	{
	}

	public find(world: WorldSettings): Version | null
	{
		const active = this.versionManager.activeVersion();
		if (active === null) {
			return null;
		}
		const baseId = this.baseId(active);
		return this.versionManager.versions().find(version =>
			version.id !== active.id
			&& this.baseId(version) === baseId
			&& version.recipeCost === active.recipeCost
			&& version.powerCost === active.powerCost
			&& [...version.mods].sort().join() === [...active.mods].sort().join()
			&& WorldSettingsLabels.same(this.worldOf(version), world),
		) ?? null;
	}

	/** For the create page: it starts filled in like the active version, with the save's world. */
	public createParams(world: WorldSettings): Params | null
	{
		const active = this.versionManager.activeVersion();
		if (active === null || world.mode === null || world.purity === null) {
			return null;
		}
		return {
			base: this.baseId(active),
			recipeCost: active.recipeCost !== 1 ? active.recipeCost : null,
			powerCost: active.powerCost !== 1 ? active.powerCost : null,
			mods: active.mods.length > 0 ? active.mods.join(',') : null,
			seed: world.seed,
			mode: world.mode,
			purity: world.purity,
		};
	}

	private baseId(version: Version): string
	{
		return version.custom ? version.baseVersion ?? version.id : version.id;
	}

	private worldOf(version: Version): WorldSettings
	{
		const data = version.worldData;
		return {seed: data?.seed ?? 0, mode: data?.mode ?? 'none', purity: data?.purity ?? 'no-change'};
	}

}
