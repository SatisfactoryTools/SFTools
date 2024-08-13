import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {GraphSettings} from '@src/Model/Settings/GraphSettings';
import {MachineDisplayMode} from '@src/Model/Settings/MachineDisplayMode';
import {NodeColors} from '@src/Model/Settings/NodeColors';
import {RateFormatter} from '@src/Model/RateFormatter';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';

/** "Graph" settings section - icons, the sloop glow, machine display and node colours. */
@Component({
	selector: 'settings-graph',
	templateUrl: './SettingsGraphComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule],
	styles: [`
		.node-preview {
			display: inline-flex;
			flex-direction: column;
			align-items: center;
			min-width: 200px;
			padding: 8px 24px;
			border-radius: 5px;
			background: #10141d;
			border: 1.5px solid #4a90d9;
			color: #dde4ef;
		}
		.node-preview .group-line { color: #aab8cc; }
	`],
})
export class SettingsGraphComponent
{

	/** Icon-visibility toggles, in the order they appear on a node/edge. */
	public readonly iconToggles: {key: keyof GraphSettings; label: string}[] = [
		{key: 'showEdgeItemIcons', label: 'Item icons on graph edges'},
		{key: 'showNodeItemIcons', label: 'Item icons on nodes'},
		{key: 'showNodeBuildingIcons', label: 'Building icons on nodes'},
		{key: 'showSubplanItemIcons', label: 'Input/output icons on subplans'},
		{key: 'showSloopCornerIcon', label: 'Sloop icon in node corner'},
	];

	public readonly nodeTypes: {key: keyof NodeColors; label: string}[] = [
		{key: 'recipe', label: 'Recipe'},
		{key: 'generator', label: 'Generator'},
		{key: 'sink', label: 'Sink'},
		{key: 'mine', label: 'Mine'},
		{key: 'input', label: 'Input'},
		{key: 'product', label: 'Product'},
		{key: 'byproduct', label: 'Byproduct'},
		{key: 'subplan', label: 'Subplan'},
	];

	public readonly machineDisplayOptions: {value: MachineDisplayMode; label: string; description: string}[] = [
		{
			value: 'total-and-groups',
			label: 'Machine total and groups',
			description: 'The number of machines to build, then one line per machine group.',
		},
		{
			value: 'decimal',
			label: 'Decimal machine count',
			description: 'A single line with the exact fractional machine count, ignoring machine groups.',
		},
		{
			value: 'groups-only',
			label: 'Machine groups only',
			description: 'The machine name, then one line per machine group - no total.',
		},
	];

	public constructor(
		private readonly settings: SettingsManager,
		private readonly rateFormatter: RateFormatter,
	)
	{
	}

	public get graph(): GraphSettings
	{
		return this.settings.graph();
	}

	public setMachineDisplay(value: MachineDisplayMode): void
	{
		this.settings.updateGraph({machineDisplay: value});
	}

	public get machineDisplayDescription(): string
	{
		return this.machineDisplayOptions.find(option => option.value === this.graph.machineDisplay)?.description ?? '';
	}

	/** Preview node bold line - an example of 3 @ 150% + 1 @ 127.5% Constructors. */
	public get previewBoldLine(): string
	{
		switch (this.graph.machineDisplay) {
			case 'decimal':
				return `${this.rateFormatter.machineCount(3.85)}× Constructor @ ${this.rateFormatter.clock(150)}%`;
			case 'groups-only':
				return 'Constructor';
			default:
				return '4× Constructor';
		}
	}

	/** Preview node machine-group lines; none in decimal display. */
	public get previewGroupLines(): string[]
	{
		if (this.graph.machineDisplay === 'decimal') {
			return [];
		}
		return [`3 @ ${this.rateFormatter.clock(150)}%`, `1 @ ${this.rateFormatter.clock(127.5)}%`];
	}

	public toggle(key: keyof GraphSettings): boolean
	{
		return this.graph[key] as boolean;
	}

	public setToggle(key: keyof GraphSettings, value: boolean): void
	{
		this.settings.updateGraph({[key]: value});
	}

	public setNodeColor(key: keyof NodeColors, color: string): void
	{
		this.settings.updateGraph({nodeColors: {...this.graph.nodeColors, [key]: color}});
	}

}
