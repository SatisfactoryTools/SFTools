import {Component, ChangeDetectionStrategy} from '@angular/core';
import {NodeColors} from '@src/Model/Settings/NodeColors';
import {SettingsConflict} from '@src/Model/Settings/SettingsConflict';
import {SettingsConflictService} from '@src/Model/Settings/SettingsConflictService';

interface DiffRow
{
	readonly label: string;
	readonly remote: string;
	readonly local: string;
	readonly remoteColor?: string;
	readonly localColor?: string;
}

const YES_NO = (v: boolean): string => v ? 'Yes' : 'No';

const NUMBER_FIELDS: {label: string; get: (c: SettingsConflict['local']['numbers']) => string}[] = [
	{label: 'Decimal separator', get: n => n.decimalSeparator === 'comma' ? 'Comma (1234,5)' : 'Dot (1234.5)'},
	{label: 'Item amount precision', get: n => `${n.itemAmountPrecision} decimals`},
	{label: 'Clock speed precision', get: n => `${n.clockSpeedPrecision} decimals`},
	{label: 'Power display', get: n => n.powerDisplay === 'mw' ? 'Megawatts only' : 'Scaled (MW/GW/TW)'},
	{label: 'Show fluid m³ unit', get: n => YES_NO(n.showFluidUnit)},
];

const GRAPH_BOOL_FIELDS: {label: string; get: (g: SettingsConflict['local']['graph']) => boolean}[] = [
	{label: 'Sloop glow', get: g => g.sloopGlow},
	{label: 'Item icons on edges', get: g => g.showEdgeItemIcons},
	{label: 'Box behind edge labels', get: g => g.showEdgeLabelBox},
	{label: 'Item icons on nodes', get: g => g.showNodeItemIcons},
	{label: 'Building icons on nodes', get: g => g.showNodeBuildingIcons},
	{label: 'Input/output icons on subplans', get: g => g.showSubplanItemIcons},
	{label: 'Sloop icon in node corner', get: g => g.showSloopCornerIcon},
];

const PLANNER_FIELDS: {label: string; get: (p: SettingsConflict['local']['planner']) => string}[] = [
	{
		label: 'Items the plan cannot produce',
		get: p => ({show: 'Show all', strike: 'Strike through', hide: 'Hide'} as const)[p.unmakeableItems],
	},
];

const NODE_COLOR_FIELDS: {label: string; key: keyof NodeColors}[] = [
	{label: 'Recipe colour', key: 'recipe'},
	{label: 'Generator colour', key: 'generator'},
	{label: 'Sink colour', key: 'sink'},
	{label: 'Mine colour', key: 'mine'},
	{label: 'Input colour', key: 'input'},
	{label: 'Product colour', key: 'product'},
	{label: 'Byproduct colour', key: 'byproduct'},
	{label: 'Subplan colour', key: 'subplan'},
];

/**
 * Login-time settings clash: shows the differing preferences side by side -
 * the account's (left) and this device's (right) - and lets the user keep one.
 */
@Component({
	selector: 'settings-conflict-dialog',
	templateUrl: './SettingsConflictDialogComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	styles: [`
		.conflict-backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); z-index: 1070; display: flex; align-items: center; justify-content: center; }
		.conflict-dialog { width: min(640px, 94vw); max-height: 85vh; display: flex; flex-direction: column; }
		.swatch { display: inline-block; width: 14px; height: 14px; border-radius: 3px; vertical-align: middle; margin-right: 6px; border: 1px solid rgba(255,255,255,0.3); }
	`],
})
export class SettingsConflictDialogComponent
{

	public constructor(public readonly conflictService: SettingsConflictService)
	{
	}

	public get rows(): DiffRow[]
	{
		const conflict = this.conflictService.conflict();
		if (!conflict) {
			return [];
		}
		const rows: DiffRow[] = [];

		NUMBER_FIELDS.forEach(field => {
			const remote = field.get(conflict.remote.numbers);
			const local = field.get(conflict.local.numbers);
			if (remote !== local) {
				rows.push({label: field.label, remote, local});
			}
		});

		GRAPH_BOOL_FIELDS.forEach(field => {
			const remote = field.get(conflict.remote.graph);
			const local = field.get(conflict.local.graph);
			if (remote !== local) {
				rows.push({label: field.label, remote: YES_NO(remote), local: YES_NO(local)});
			}
		});

		PLANNER_FIELDS.forEach(field => {
			const remote = field.get(conflict.remote.planner);
			const local = field.get(conflict.local.planner);
			if (remote !== local) {
				rows.push({label: field.label, remote, local});
			}
		});

		NODE_COLOR_FIELDS.forEach(field => {
			const remote = conflict.remote.graph.nodeColors[field.key];
			const local = conflict.local.graph.nodeColors[field.key];
			if (remote !== local) {
				rows.push({label: field.label, remote, local, remoteColor: remote, localColor: local});
			}
		});

		return rows;
	}

	public acceptRemote(): void
	{
		this.conflictService.acceptRemote();
	}

	public acceptLocal(): void
	{
		this.conflictService.acceptLocal();
	}

}
