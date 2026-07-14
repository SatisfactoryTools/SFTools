import {Settings} from '@src/Model/Settings/Settings';

/** Factory defaults and normalisation for the global settings object. */
export class SettingsDefaults
{

	/** Every field falls back to these when unset or unsaved. */
	public static readonly SETTINGS: Settings = {
		numbers: {
			decimalSeparator: 'dot',
			itemAmountPrecision: 2,
			clockSpeedPrecision: 4,
			machineCountPrecision: 3,
			powerDisplay: 'scaled',
			showFluidUnit: true,
		},
		graph: {
			sloopGlow: true,
			showEdgeItemIcons: true,
			showEdgeLabelBox: true,
			showNodeItemIcons: true,
			showNodeBuildingIcons: true,
			showSubplanItemIcons: true,
			showSloopCornerIcon: true,
			machineDisplay: 'total-and-groups',
			// The graph's original node accent colours; fills are derived from these.
			nodeColors: {
				recipe: '#4a90d9',
				generator: '#e0c341',
				sink: '#e05c8a',
				mine: '#4caf50',
				input: '#26a69a',
				product: '#ffc107',
				byproduct: '#9c27b0',
				subplan: '#e07be0',
			},
		},
		planner: {
			unmakeableItems: 'show',
		},
		panels: null,
	};

	/** Fills in any missing field so callers always get a complete object. */
	public static normalize(data: Settings | null): Settings
	{
		return {
			numbers: {...SettingsDefaults.SETTINGS.numbers, ...(data?.numbers ?? {})},
			graph: {
				...SettingsDefaults.SETTINGS.graph,
				...(data?.graph ?? {}),
				nodeColors: {...SettingsDefaults.SETTINGS.graph.nodeColors, ...(data?.graph?.nodeColors ?? {})},
			},
			planner: {...SettingsDefaults.SETTINGS.planner, ...(data?.planner ?? {})},
			panels: data?.panels ?? null,
		};
	}

}
