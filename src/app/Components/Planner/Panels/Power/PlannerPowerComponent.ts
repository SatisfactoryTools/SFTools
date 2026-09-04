import {Component, ChangeDetectionStrategy, Signal, computed, signal} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronDown, faChevronRight} from '@fortawesome/free-solid-svg-icons';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {PowerDrawComponent} from '@src/Components/Common/PowerDrawComponent';
import {PlanBreakdownService} from '@src/Model/Planner/Breakdown/PlanBreakdownService';
import {PowerBreakdown} from '@src/Model/Planner/Breakdown/PowerBreakdown';
import {PowerRow} from '@src/Model/Planner/Breakdown/PowerRow';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PowerDraw} from '@src/Model/Planner/PowerDraw';
import {RateFormatter} from '@src/Model/RateFormatter';

/**
 * Power usage of the plan, grouped by building type. Each building row
 * expands into the recipes those machines run (machine groups and average
 * power per the clocking formula); generators show as production, subplans
 * as one summed row each.
 */
@Component({
	selector: 'planner-power',
	changeDetection: ChangeDetectionStrategy.Eager,
	templateUrl: './PlannerPowerComponent.html',
	imports: [FaIconComponent, GameIconComponent, InfoNoteComponent, PowerDrawComponent],
})
export class PlannerPowerComponent
{

	public readonly faChevronDown = faChevronDown;
	public readonly faChevronRight = faChevronRight;

	private readonly searchTermSignal = signal('');
	public readonly searchTerm = this.searchTermSignal.asReadonly();

	private readonly expandedKeysSignal = signal<ReadonlySet<string>>(new Set());

	/** Folder selected: one summed row per plan; plan selected: rows per building type. */
	public readonly isFolderView = computed(() => this.planManager.activeFolder() !== null);

	public readonly breakdown: Signal<PowerBreakdown> = computed(() => {
		const folder = this.planManager.activeFolder();
		return folder
			? this.breakdownService.powerForFolder(folder.id)
			: this.breakdownService.power(this.planManager.activePlan());
	});

	public readonly rows: Signal<PowerRow[]> = computed(() =>
		this.filterRows(this.breakdown().rows, this.searchTerm().trim().toLowerCase()));

	public readonly hasRows = computed(() => this.breakdown().rows.length > 0);

	public constructor(
		private readonly planManager: PlanManager,
		private readonly breakdownService: PlanBreakdownService,
		public readonly rateFormatter: RateFormatter,
	)
	{
	}

	public setSearchTerm(value: string): void
	{
		this.searchTermSignal.set(value);
	}

	/** An active search auto-expands rows, so matched recipes are visible. */
	public isExpanded(row: PowerRow): boolean
	{
		return row.entries.length > 0
			&& (this.searchTerm().trim() !== '' || this.expandedKeysSignal().has(row.key));
	}

	public toggle(row: PowerRow): void
	{
		if (row.entries.length === 0) {
			return;
		}
		const keys = new Set(this.expandedKeysSignal());
		keys.has(row.key) ? keys.delete(row.key) : keys.add(row.key);
		this.expandedKeysSignal.set(keys);
	}

	/** A negative balance is (net) production - shown green; float noise reads as zero. */
	public isProduction(power: PowerDraw): boolean
	{
		return power.average < 0 && !this.rateFormatter.isZero(power.average);
	}

	public netIsSurplus(): boolean
	{
		return this.isProduction(this.breakdown().net.negate());
	}

	private filterRows(rows: PowerRow[], term: string): PowerRow[]
	{
		if (term === '') {
			return rows;
		}
		const matching: PowerRow[] = [];
		rows.forEach(row => {
			if (row.name.toLowerCase().includes(term)) {
				matching.push(row);
				return;
			}
			const entries = row.entries.filter(entry => entry.name.toLowerCase().includes(term));
			if (entries.length > 0) {
				matching.push({...row, entries});
			}
		});
		return matching;
	}

}
