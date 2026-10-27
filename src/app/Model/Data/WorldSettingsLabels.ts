import {WorldDataMode} from '@src/Model/API/Schema/World/WorldDataMode';
import {WorldDataPurity} from '@src/Model/API/Schema/World/WorldDataPurity';
import {WorldSettings} from '@src/Model/Data/WorldSettings';

export class WorldSettingsLabels
{

	public static readonly MODES: ReadonlyArray<{value: WorldDataMode; label: string}> = [
		{value: 'none', label: 'Vanilla (no change)'},
		{value: 'random', label: 'Random'},
		{value: 'basic-rich', label: 'Basic rich'},
		{value: 'advanced-rich', label: 'Advanced rich'},
		{value: 'fossil-fuel-rich', label: 'Fossil fuel rich'},
	];

	public static readonly PURITIES: ReadonlyArray<{value: WorldDataPurity; label: string}> = [
		{value: 'no-change', label: 'No change'},
		{value: 'all-impure', label: 'All impure'},
		{value: 'decrease', label: 'Decrease'},
		{value: 'all-normal', label: 'All normal'},
		{value: 'increase', label: 'Increase'},
		{value: 'all-pure', label: 'All pure'},
		{value: 'all-random', label: 'All random'},
	];

	/** The seed only matters once something is randomized. */
	public static isDefault(world: WorldSettings): boolean
	{
		return world.mode === 'none' && world.purity === 'no-change';
	}

	public static same(a: WorldSettings, b: WorldSettings): boolean
	{
		if (a.mode === null || a.purity === null || b.mode === null || b.purity === null) {
			return false;
		}
		if (WorldSettingsLabels.isDefault(a) || WorldSettingsLabels.isDefault(b)) {
			return WorldSettingsLabels.isDefault(a) && WorldSettingsLabels.isDefault(b);
		}
		return a.seed === b.seed && a.mode === b.mode && a.purity === b.purity;
	}

	public static describe(world: WorldSettings): string
	{
		if (WorldSettingsLabels.isDefault(world)) {
			return 'the default world';
		}
		const mode = world.mode === 'none' ? 'Default' : WorldSettingsLabels.MODES.find(option => option.value === world.mode)?.label ?? 'Unknown';
		const purity = WorldSettingsLabels.PURITIES.find(option => option.value === world.purity)?.label ?? 'unknown';
		return `${mode} nodes, purity ${purity.toLowerCase()}, seed ${world.seed}`;
	}

}
