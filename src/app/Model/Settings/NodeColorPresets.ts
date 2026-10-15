import {NodeColorPreset} from '@src/Model/Settings/NodeColorPreset';
import {SettingsDefaults} from '@src/Model/Settings/SettingsDefaults';

export class NodeColorPresets
{

	public static readonly ALL: readonly NodeColorPreset[] = [
		{
			id: 'default',
			label: 'Default',
			description: 'The standard colours.',
			colors: SettingsDefaults.SETTINGS.graph.nodeColors,
			fillStrength: SettingsDefaults.SETTINGS.graph.nodeFillStrength,
		},
		{
			id: 'beta',
			label: 'Beta tools',
			description: 'The darker nodes of the new tools while they were in beta.',
			colors: SettingsDefaults.SETTINGS.graph.nodeColors,
			fillStrength: 0.2,
		},
		{
			id: 'old-tools',
			label: 'Old tools',
			description: 'Solid nodes in the colours of the old Satisfactory Tools.',
			// The old tools had no augmenter or subplan nodes; those two are picked to sit well next to the rest.
			colors: {
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
			fillStrength: 1,
		},
		{
			id: 'colour-blind',
			label: 'Colour-blind safe',
			description: 'The Okabe-Ito colours, which stay apart for the common kinds of colour blindness.',
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
			fillStrength: SettingsDefaults.SETTINGS.graph.nodeFillStrength,
		},
		{
			id: 'high-contrast',
			label: 'High contrast',
			description: 'Very bright, saturated colours that are easy to tell apart on a dim or glaring screen.',
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
			fillStrength: SettingsDefaults.SETTINGS.graph.nodeFillStrength,
		},
	];

}
