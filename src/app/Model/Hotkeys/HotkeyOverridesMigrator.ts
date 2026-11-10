import {HotkeyBinding} from '@src/Model/Hotkeys/HotkeyBinding';
import {HotkeyCatalog} from '@src/Model/Hotkeys/HotkeyCatalog';
import {HotkeyFormatter} from '@src/Model/Hotkeys/HotkeyFormatter';
import {HotkeyMerge} from '@src/Model/Hotkeys/HotkeyMerge';
import {HotkeyOverrides} from '@src/Model/Hotkeys/HotkeyOverrides';

/** Settings are saved whole, so overrides of merged actions are rewritten on read and the old ids disappear with the next save. */
export class HotkeyOverridesMigrator
{

	private static readonly MERGES: readonly HotkeyMerge[] = [
		{target: 'plans.rename', sources: ['plans.renamePlan', 'plans.renameFolder']},
		{target: 'plans.clone', sources: ['plans.clonePlan', 'plans.cloneFolder']},
		{target: 'plans.share', sources: ['plans.sharePlan', 'plans.shareFolder']},
		{target: 'plans.delete', sources: ['plans.deletePlan', 'plans.deleteFolder']},
		{target: 'graph.disableItem', sources: ['graph.disableRecipe', 'graph.disableFuel', 'graph.disableByproduct', 'graph.disableResource']},
		{target: 'graph.disableMachine', sources: ['graph.disableMachine', 'graph.disableGenerator']},
		{target: 'graph.removeItem', sources: ['graph.removeProduct', 'graph.removeInput']},
	];

	/** Factory keys of the retired actions, so an untouched default still counts as "had a key". */
	private static readonly RETIRED_DEFAULTS: Record<string, HotkeyBinding> = {
		'plans.renamePlan': {key: 'F2', shift: true},
		'plans.clonePlan': {key: 'd', ctrl: true},
		'plans.sharePlan': {key: 's', ctrl: true, shift: true},
		'plans.deletePlan': {key: 'Delete', ctrl: true},
	};

	public static migrate(overrides: HotkeyOverrides): HotkeyOverrides
	{
		const result = {...overrides};
		const formatter = new HotkeyFormatter();
		HotkeyOverridesMigrator.MERGES.forEach(merge => {
			if (!merge.sources.some(source => source in overrides)) {
				return;
			}
			const inherited = HotkeyOverridesMigrator.inherited(merge, overrides);
			merge.sources.forEach(source => delete result[source]);
			if (merge.target in overrides && !merge.sources.includes(merge.target)) {
				return;
			}
			const factory = HotkeyCatalog.definition(merge.target)?.default ?? null;
			const unchanged = inherited === null || factory === null
				? inherited === factory
				: formatter.signature(inherited) === formatter.signature(factory);
			if (!unchanged) {
				result[merge.target] = inherited;
			}
		});
		return result;
	}

	/** A key the user picked beats a factory key that was merely left alone. */
	private static inherited(merge: HotkeyMerge, overrides: HotkeyOverrides): HotkeyBinding | null
	{
		const picked = merge.sources.map(source => overrides[source] ?? null).find(binding => binding !== null);
		if (picked) {
			return picked;
		}
		return merge.sources
			.map(source => source in overrides ? null : HotkeyOverridesMigrator.RETIRED_DEFAULTS[source] ?? null)
			.find(binding => binding !== null) ?? null;
	}

}
