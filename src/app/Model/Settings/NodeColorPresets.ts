import {NodeColorPreset} from '@src/Model/Settings/NodeColorPreset';
import {SettingsDefaults} from '@src/Model/Settings/SettingsDefaults';

export class NodeColorPresets
{

	public static readonly ALL: readonly NodeColorPreset[] = [
		{
			id: 'old-tools',
			label: 'Old tools',
			description: 'Solid nodes in the colours of the old Satisfactory Tools.',
			colors: SettingsDefaults.SETTINGS.graph.nodeAccentColors,
			fillStrength: SettingsDefaults.SETTINGS.graph.nodeFillAmount,
		},
		{
			id: 'new-tools',
			label: 'New tools',
			description: 'The lighter nodes the new tools started with.',
			colors: SettingsDefaults.NEW_TOOLS_NODE_COLORS,
			fillStrength: SettingsDefaults.NEW_TOOLS_NODE_FILL,
		},
		{
			id: 'beta',
			label: 'Beta tools',
			description: 'The darker nodes from the beta of the new tools.',
			colors: SettingsDefaults.NEW_TOOLS_NODE_COLORS,
			fillStrength: 0.2,
		},
		{
			id: 'colour-blind',
			label: 'Colour-blind safe',
			description: 'Okabe-Ito colours. Easy to tell apart with common colour blindness.',
			colors: {
				recipe: '#56b4e9',
				generator: '#f0e442',
				augmenter: '#e69f00',
				sink: '#d55e00',
				mine: '#009e73',
				input: '#0072b2',
				product: '#ffffff',
				byproduct: '#cc79a7',
				subplan: '#bbbbbb',
			},
			fillStrength: SettingsDefaults.NEW_TOOLS_NODE_FILL,
		},
		{
			id: 'high-contrast',
			label: 'High contrast',
			description: 'Bright colours that are easy to tell apart.',
			colors: {
				recipe: '#00b0ff',
				generator: '#ffea00',
				augmenter: '#d500f9',
				sink: '#ff1744',
				mine: '#00e676',
				input: '#18ffff',
				product: '#ff9100',
				byproduct: '#f06292',
				subplan: '#ffffff',
			},
			fillStrength: SettingsDefaults.NEW_TOOLS_NODE_FILL,
		},
	];

}
