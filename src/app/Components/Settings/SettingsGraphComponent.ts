import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {GraphSettings} from '@src/Model/Settings/GraphSettings';
import {MachineDisplayMode} from '@src/Model/Settings/MachineDisplayMode';
import {NodeColors} from '@src/Model/Settings/NodeColors';
import {RateFormatter} from '@src/Model/RateFormatter';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';
import {SettingsSectionComponent} from '@src/Components/Settings/SettingsSectionComponent';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {faDiagramProject} from '@fortawesome/free-solid-svg-icons';

/** "Graph" settings section - icons, the sloop glow, machine display and node colours. */
@Component({
	selector: 'settings-graph',
	templateUrl: './SettingsGraphComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FormsModule, SettingsSectionComponent, InfoNoteComponent],
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

	public readonly sectionIcon = faDiagramProject;

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
			value: 'percent',
			label: 'Total clock percentage',
			description: 'A single line with the total clock speed needed - 375% is 3.75 machines at 100% - ignoring machine groups.',
		},
		{
			value: 'groups-only',
			label: 'Machine groups only',
			description: 'The machine name, then one line per machine group - no total.',
		},
	];

	/** Node/edge size multipliers offered; 1 is the original size. */
	public readonly scaleOptions: {value: number; label: string}[] = [
		{value: 0.75, label: '75%'},
		{value: 1, label: '100% (default)'},
		{value: 1.25, label: '125%'},
		{value: 1.5, label: '150%'},
		{value: 1.75, label: '175%'},
		{value: 2, label: '200%'},
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

	public setNodeScale(value: string | number): void
	{
		this.settings.updateGraph({nodeScale: Number(value)});
	}

	public setEdgeScale(value: string | number): void
	{
		this.settings.updateGraph({edgeScale: Number(value)});
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
			case 'percent':
				return `${this.rateFormatter.clock(577.5)}% Constructor`;
			case 'groups-only':
				return 'Constructor';
			default:
				return '4× Constructor';
		}
	}

	/** Preview node machine-group lines; none in the single-line (decimal, percent) displays. */
	public get previewGroupLines(): string[]
	{
		if (this.graph.machineDisplay === 'decimal' || this.graph.machineDisplay === 'percent') {
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
