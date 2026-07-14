import {Component, ChangeDetectionStrategy} from '@angular/core';
import {RouterLink} from '@angular/router';
import {Version} from '@src/Model/API/Schema/Version';
import {WorldDataPayload} from '@src/Model/API/Schema/World/WorldDataPayload';
import {AuthService} from '@src/Model/Auth/AuthService';
import {VersionManager} from '@src/Model/Data/VersionManager';

const WORLD_MODE_LABELS: Record<string, string> = {
	'none': 'default nodes',
	'random': 'random nodes',
	'basic-rich': 'basic rich nodes',
	'advanced-rich': 'advanced rich nodes',
	'fossil-fuel-rich': 'fossil fuel rich nodes',
};

const WORLD_PURITY_LABELS: Record<string, string> = {
	'no-change': 'default purity',
	'all-impure': 'all impure',
	'decrease': 'decreased purity',
	'all-normal': 'all normal',
	'increase': 'increased purity',
	'all-pure': 'all pure',
	'all-random': 'random purity',
};

/** The landing page: project header, About link, and the game version picker (public + own custom). */
@Component({
	templateUrl: './HomeComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [
		RouterLink,
	],
})
export class HomeComponent
{

	public constructor(
		protected readonly versionManager: VersionManager,
		protected readonly auth: AuthService,
	)
	{
	}

	public get publicVersions(): Version[]
	{
		return this.versionManager.versions().filter(version => !version.custom);
	}

	public get customVersions(): Version[]
	{
		return this.versionManager.versions().filter(version => version.custom);
	}

	/**
	 * One-line description of a version. Public versions state what they are;
	 * custom versions list their base and every non-default modifier,
	 * including the world generation settings.
	 */
	public versionSummary(version: Version): string
	{
		const parts: string[] = [];

		if (!version.custom) {
			parts.push(version.official ? 'Official release' : 'Public version');
			if (version.ficsmas) {
				parts.push('FICSMAS event');
			}
		}

		const base = this.versionManager.versions().find(candidate => candidate.id === version.baseVersion);
		if (base) {
			parts.push(`Based on ${base.name}`);
		}
		parts.push(`recipe cost ×${version.recipeCost}`);
		parts.push(`power cost ×${version.powerCost}`);

		const modCount = version.mods?.length ?? 0;
		if (modCount > 0) {
			parts.push(`${modCount} mod${modCount === 1 ? '' : 's'}`);
		}
		if (version.worldData) {
			parts.push(...this.worldSummary(version.worldData));
		}
		return parts.join(' · ');
	}

	/**
	 * The world-generation changes: node mode, purity, and the seed they ran
	 * with. worldData with vanilla generation settings means only the counts
	 * were edited by hand.
	 */
	private worldSummary(world: WorldDataPayload): string[]
	{
		const parts: string[] = [];
		if (world.mode !== undefined) {
			parts.push(WORLD_MODE_LABELS[world.mode] ?? world.mode);
		}
		if (world.purity !== undefined) {
			parts.push(WORLD_PURITY_LABELS[world.purity] ?? world.purity);
		}
		if (parts.length === 0) {
			return ['modified resources'];
		}
		if (world.seed !== undefined) {
			parts.push(`seed ${world.seed}`);
		}
		return parts;
	}

	/** Only removes the user's link (or localStorage entry) - the version itself is shared and keeps existing. */
	public removeVersion(version: Version): void
	{
		if (confirm(`Remove "${version.name}" from your versions? Plans referencing it keep working, and creating the same definition again brings it back.`)) {
			this.versionManager.removeCustomVersion(version);
		}
	}

}
