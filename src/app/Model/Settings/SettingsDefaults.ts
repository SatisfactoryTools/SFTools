import {CalculatorTabDefinitions} from '@src/Components/Planner/Panels/Calculator/CalculatorTabDefinitions';
import {GraphLayoutDefaults} from '@src/Model/Planner/GraphLayoutDefaults';
import {GraphSettings} from '@src/Model/Settings/GraphSettings';
import {LegacyGraphSettings} from '@src/Model/Settings/LegacyGraphSettings';
import {NodeColors} from '@src/Model/Settings/NodeColors';
import {Settings} from '@src/Model/Settings/Settings';

export class SettingsDefaults
{

	/** The node look the new tools launched with, now the "New tools" preset. */
	public static readonly NEW_TOOLS_NODE_COLORS: NodeColors = {
		recipe: '#4a90d9',
		generator: '#e0c341',
		augmenter: '#8e6fd8',
		sink: '#e05c8a',
		mine: '#4caf50',
		input: '#26a69a',
		product: '#ffc107',
		byproduct: '#9c27b0',
		subplan: '#e07be0',
	};

	// High enough that nodes stand out from the dark canvas, low enough to keep white text above 6:1 for any accent.
	public static readonly NEW_TOOLS_NODE_FILL = 0.38;

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
			simplifyWhenZoomedOut: true,
			showEdgeItemIcons: true,
			// Renamed from showEdgeLabelBox: settings are saved whole, so the old key would keep the previous default for everyone.
			showEdgeLabelBoxes: false,
			showNodeItemIcons: true,
			showNodeBuildingIcons: true,
			showSubplanItemIcons: true,
			showSloopCornerIcon: true,
			machineDisplay: 'total-and-groups',
			nodeScale: 1,
			edgeScale: 1,
			// Renamed from nodeColors/nodeFillStrength when the old tools' look became the default; see normalize().
			// The old tools had no augmenter or subplan nodes; those two are picked to sit well next to the rest.
			nodeAccentColors: {
				recipe: '#df691a',
				generator: '#5377e3',
				augmenter: '#7e57c2',
				sink: '#d9534f',
				mine: '#4e5d6c',
				input: '#af6d0e',
				product: '#50a050',
				byproduct: '#8b4513',
				subplan: '#2a9d8f',
			},
			nodeFillAmount: 1,
		},
		planner: {
			unmakeableItems: 'show',
			railSize: 'small',
			tabBadges: true,
			tabLabels: 'auto',
			groupTabs: true,
			moreTabs: CalculatorTabDefinitions.DEFAULT_MORE,
			helpButtons: true,
			supporterHearts: true,
		},
		planDefaults: {
			alternateRecipes: false,
			conversionRecipes: false,
			graphDirection: GraphLayoutDefaults.SETTINGS.direction,
			graphEdgeShape: GraphLayoutDefaults.SETTINGS.edgeShape,
			graphNodeSpacing: GraphLayoutDefaults.SETTINGS.nodeSpacing,
			graphLayerSpacing: GraphLayoutDefaults.SETTINGS.layerSpacing,
			groupingMode: 'underclock-last',
		},
		account: {
			signInPrompts: true,
		},
		hotkeys: {},
		panels: null,
	};

	public static normalize(data: Settings | null): Settings
	{
		return {
			numbers: {...SettingsDefaults.SETTINGS.numbers, ...(data?.numbers ?? {})},
			graph: SettingsDefaults.normalizeGraph(data?.graph ?? null),
			planner: {...SettingsDefaults.SETTINGS.planner, ...(data?.planner ?? {})},
			planDefaults: {...SettingsDefaults.SETTINGS.planDefaults, ...(data?.planDefaults ?? {})},
			account: {...SettingsDefaults.SETTINGS.account, ...(data?.account ?? {})},
			hotkeys: {...(data?.hotkeys ?? {})},
			panels: data?.panels ?? null,
		};
	}

	/**
	 * Settings are saved whole, so the old nodeColors/nodeFillStrength keys hold the launch defaults for everyone who
	 * ever saved a setting. They are read until the next save: values still equal to the launch look give way to the new default,
	 * changed ones carry over.
	 */
	private static normalizeGraph(data: (Partial<GraphSettings> & LegacyGraphSettings) | null): GraphSettings
	{
		const {nodeColors: legacyColors, nodeFillStrength: legacyFill, ...graph} = data ?? {};
		const defaults = SettingsDefaults.SETTINGS.graph;
		let colors = graph.nodeAccentColors;
		let fill = graph.nodeFillAmount;
		if (colors === undefined && fill === undefined && (legacyColors !== undefined || legacyFill !== undefined)) {
			const legacy = {...SettingsDefaults.NEW_TOOLS_NODE_COLORS, ...(legacyColors ?? {})};
			const changed = (legacyFill ?? SettingsDefaults.NEW_TOOLS_NODE_FILL) !== SettingsDefaults.NEW_TOOLS_NODE_FILL
				|| (Object.keys(legacy) as (keyof NodeColors)[]).some(key => legacy[key].toLowerCase() !== SettingsDefaults.NEW_TOOLS_NODE_COLORS[key]);
			if (changed) {
				colors = legacy;
				fill = legacyFill ?? SettingsDefaults.NEW_TOOLS_NODE_FILL;
			}
		}
		return {
			...defaults,
			...graph,
			nodeAccentColors: {...defaults.nodeAccentColors, ...(colors ?? {})},
			nodeFillAmount: fill ?? defaults.nodeFillAmount,
		};
	}

}
