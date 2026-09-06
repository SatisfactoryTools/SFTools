import {Component, ChangeDetectionStrategy} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faCloud, faCodeCompare, faDesktop} from '@fortawesome/free-solid-svg-icons';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {SettingsDiffRow} from '@src/Components/Settings/SettingsDiffRow';
import {SettingsFieldLabel} from '@src/Components/Settings/SettingsFieldLabel';
import {AccountSettings} from '@src/Model/Settings/AccountSettings';
import {GraphSettings} from '@src/Model/Settings/GraphSettings';
import {NodeColors} from '@src/Model/Settings/NodeColors';
import {NumberSettings} from '@src/Model/Settings/NumberSettings';
import {PlannerSettings} from '@src/Model/Settings/PlannerSettings';
import {SettingsConflictService} from '@src/Model/Settings/SettingsConflictService';

const YES_NO = (value: unknown): string => value ? 'Yes' : 'No';
const DECIMALS = (value: unknown): string => `${value} decimals`;
const PERCENT = (value: unknown): string => `${Math.round(Number(value) * 100)}%`;
const CHOICE = (labels: Record<string, string>) => (value: unknown): string => labels[String(value)] ?? String(value);

// Typed as Record<keyof …> on purpose: adding a settings field without a
// label here is a compile error, so the dialog can never silently skip one.
const NUMBER_LABELS: Record<keyof NumberSettings, SettingsFieldLabel> = {
	decimalSeparator: {label: 'Decimal separator', format: CHOICE({dot: 'Dot (1234.5)', comma: 'Comma (1234,5)'})},
	itemAmountPrecision: {label: 'Item amount precision', format: DECIMALS},
	clockSpeedPrecision: {label: 'Clock speed precision', format: DECIMALS},
	machineCountPrecision: {label: 'Machine count precision', format: DECIMALS},
	powerDisplay: {label: 'Power display', format: CHOICE({scaled: 'Scaled (MW/GW/TW)', mw: 'Megawatts only'})},
	showFluidUnit: {label: 'Show fluid m³ unit', format: YES_NO},
};

const GRAPH_LABELS: Record<Exclude<keyof GraphSettings, 'nodeColors'>, SettingsFieldLabel> = {
	sloopGlow: {label: 'Sloop glow', format: YES_NO},
	showEdgeItemIcons: {label: 'Item icons on edges', format: YES_NO},
	showEdgeLabelBox: {label: 'Box behind edge labels', format: YES_NO},
	showNodeItemIcons: {label: 'Item icons on nodes', format: YES_NO},
	showNodeBuildingIcons: {label: 'Building icons on nodes', format: YES_NO},
	showSubplanItemIcons: {label: 'Input/output icons on subplans', format: YES_NO},
	showSloopCornerIcon: {label: 'Sloop icon in node corner', format: YES_NO},
	machineDisplay: {
		label: 'Machine count display',
		format: CHOICE({
			'total-and-groups': 'Machine total and groups',
			'decimal': 'Decimal machine count',
			'percent': 'Total clock percentage',
			'groups-only': 'Machine groups only',
		}),
	},
	nodeScale: {label: 'Node size', format: PERCENT},
	edgeScale: {label: 'Edge label size', format: PERCENT},
};

const PLANNER_LABELS: Record<keyof PlannerSettings, SettingsFieldLabel> = {
	unmakeableItems: {
		label: 'Items the plan cannot produce',
		format: CHOICE({show: 'Show all', strike: 'Strike through', hide: 'Hide'}),
	},
	tabBadges: {label: 'Counts on production request tabs', format: YES_NO},
	tabLabels: {
		label: 'Production request tab labels',
		format: CHOICE({auto: 'Fit to width', icons: 'Icons only', labels: 'Always labels'}),
	},
};

const ACCOUNT_LABELS: Record<keyof AccountSettings, SettingsFieldLabel> = {
	signInPrompts: {label: 'Sign-in reminders', format: YES_NO},
};

const NODE_COLOR_LABELS: Record<keyof NodeColors, string> = {
	recipe: 'Recipe colour',
	generator: 'Generator colour',
	sink: 'Sink colour',
	mine: 'Mine colour',
	input: 'Input colour',
	product: 'Product colour',
	byproduct: 'Byproduct colour',
	subplan: 'Subplan colour',
};

/**
 * Login-time settings clash: shows the differing preferences side by side -
 * the account's and this device's - grouped by settings section, and lets
 * the user keep one set. Every field of every section is compared; a field
 * the label tables do not know (e.g. one added server-side) still shows up
 * under a humanised key name rather than being dropped.
 */
@Component({
	selector: 'settings-conflict-dialog',
	templateUrl: './SettingsConflictDialogComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, InfoNoteComponent],
	styles: [`
		.conflict-backdrop {
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.6);
			z-index: 1070;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 1rem;
		}
		.conflict-dialog {
			width: min(680px, 100%);
			max-height: 90vh;
			display: flex;
			flex-direction: column;
			box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.5);
		}
		.conflict-body {
			overflow-y: auto;
			padding: 1rem;
			display: flex;
			flex-direction: column;
			gap: 0.75rem;
		}
		.conflict-table {
			--bs-table-color: var(--bs-body-color);
			--bs-table-bg: transparent;
		}
		.conflict-table th {
			font-weight: 600;
		}
		.conflict-table .group-row th {
			font-size: 0.75rem;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.04em;
			color: #9fb0c0;
			padding-top: 0.6rem;
			border-bottom: 0;
		}
		.side-head {
			display: inline-flex;
			align-items: center;
			gap: 0.4rem;
		}
		.side-head.account { color: #9ccdf7; }
		.side-head.device { color: #f7d08a; }
		.swatch {
			display: inline-block;
			width: 14px;
			height: 14px;
			border-radius: 3px;
			vertical-align: -2px;
			margin-right: 6px;
			border: 1px solid rgba(255, 255, 255, 0.3);
		}
		.card-footer {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
			justify-content: flex-end;
		}
	`],
})
export class SettingsConflictDialogComponent
{

	public readonly faCodeCompare = faCodeCompare;
	public readonly faCloud = faCloud;
	public readonly faDesktop = faDesktop;

	public constructor(public readonly conflictService: SettingsConflictService)
	{
	}

	public get rows(): SettingsDiffRow[]
	{
		const conflict = this.conflictService.conflict();
		if (!conflict) {
			return [];
		}
		const {remote, local} = conflict;
		const {nodeColors: remoteColors, ...remoteGraph} = remote.graph;
		const {nodeColors: localColors, ...localGraph} = local.graph;

		return [
			...this.diff('Numbers', remote.numbers, local.numbers, NUMBER_LABELS),
			...this.diff('Graph', remoteGraph, localGraph, GRAPH_LABELS),
			...this.diffColors(remoteColors, localColors),
			...this.diff('Planner', remote.planner, local.planner, PLANNER_LABELS),
			...this.diff('Account', remote.account, local.account, ACCOUNT_LABELS),
		];
	}

	/** Groups in display order, each with its rows - the template renders a heading per group. */
	public get groups(): {name: string; rows: SettingsDiffRow[]}[]
	{
		const groups: {name: string; rows: SettingsDiffRow[]}[] = [];
		this.rows.forEach(row => {
			const group = groups.find(candidate => candidate.name === row.group);
			if (group) {
				group.rows.push(row);
			} else {
				groups.push({name: row.group, rows: [row]});
			}
		});
		return groups;
	}

	public acceptRemote(): void
	{
		this.conflictService.acceptRemote();
	}

	public acceptLocal(): void
	{
		this.conflictService.acceptLocal();
	}

	private diff<T extends object>(
		group: string,
		remote: T,
		local: T,
		labels: Partial<Record<keyof T, SettingsFieldLabel>>,
	): SettingsDiffRow[]
	{
		const keys = new Set<string>([...Object.keys(remote), ...Object.keys(local)]);
		const rows: SettingsDiffRow[] = [];
		keys.forEach(key => {
			const remoteValue = (remote as Record<string, unknown>)[key];
			const localValue = (local as Record<string, unknown>)[key];
			if (JSON.stringify(remoteValue) === JSON.stringify(localValue)) {
				return;
			}
			const field = labels[key as keyof T];
			const format = field?.format ?? ((value: unknown) => typeof value === 'object' ? JSON.stringify(value) : String(value));
			rows.push({
				group,
				label: field?.label ?? SettingsConflictDialogComponent.humanize(key),
				remote: format(remoteValue),
				local: format(localValue),
			});
		});
		return rows;
	}

	private diffColors(remote: NodeColors, local: NodeColors): SettingsDiffRow[]
	{
		const keys = new Set([...Object.keys(remote), ...Object.keys(local)] as (keyof NodeColors)[]);
		const rows: SettingsDiffRow[] = [];
		keys.forEach(key => {
			const remoteValue = remote[key];
			const localValue = local[key];
			if (remoteValue === localValue) {
				return;
			}
			rows.push({
				group: 'Graph colours',
				label: NODE_COLOR_LABELS[key] ?? `${SettingsConflictDialogComponent.humanize(key)} colour`,
				remote: remoteValue,
				local: localValue,
				remoteColor: remoteValue,
				localColor: localValue,
			});
		});
		return rows;
	}

	/** camelCase key → "Camel case", for fields without a label entry. */
	private static humanize(key: string): string
	{
		const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
		return spaced.charAt(0).toUpperCase() + spaced.slice(1);
	}

}
