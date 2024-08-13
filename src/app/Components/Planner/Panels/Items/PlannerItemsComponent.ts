import {Component, ChangeDetectionStrategy, Signal, computed, signal} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronDown, faChevronRight} from '@fortawesome/free-solid-svg-icons';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {ItemRow} from '@src/Model/Planner/Breakdown/ItemRow';
import {PlanBreakdownService} from '@src/Model/Planner/Breakdown/PlanBreakdownService';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {RateFormatter} from '@src/Model/RateFormatter';

/**
 * Item flows of the plan, grouped by item. Each row sums the item's sources
 * (produced or brought in) and targets (consumed or shipped out) and expands
 * into the individual producers and consumers; subplans appear by name.
 */
@Component({
	selector: 'planner-items',
	changeDetection: ChangeDetectionStrategy.Eager,
	templateUrl: './PlannerItemsComponent.html',
	imports: [FaIconComponent, GameIconComponent],
})
export class PlannerItemsComponent
{

	public readonly faChevronDown = faChevronDown;
	public readonly faChevronRight = faChevronRight;

	private readonly searchTermSignal = signal('');
	public readonly searchTerm = this.searchTermSignal.asReadonly();

	private readonly expandedKeysSignal = signal<ReadonlySet<string>>(new Set());

	/** Folder selected: each plan's outside interface; plan selected: every node's flows. */
	public readonly isFolderView = computed(() => this.planManager.activeFolder() !== null);

	private readonly allRows: Signal<ItemRow[]> = computed(() => {
		const folder = this.planManager.activeFolder();
		return folder
			? this.breakdownService.itemsForFolder(folder.id)
			: this.breakdownService.items(this.planManager.activePlan());
	});

	public readonly rows: Signal<ItemRow[]> = computed(() =>
		this.filterRows(this.allRows(), this.searchTerm().trim().toLowerCase()));

	public readonly hasRows = computed(() => this.allRows().length > 0);

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

	/** An active search auto-expands rows, so matched sources/targets are visible. */
	public isExpanded(row: ItemRow): boolean
	{
		return this.searchTerm().trim() !== '' || this.expandedKeysSignal().has(row.item.className);
	}

	public toggle(row: ItemRow): void
	{
		const keys = new Set(this.expandedKeysSignal());
		keys.has(row.item.className) ? keys.delete(row.item.className) : keys.add(row.item.className);
		this.expandedKeysSignal.set(keys);
	}

	/** Balanced means the net displays as zero - solver float noise must not read as surplus/deficit. */
	public isBalanced(row: ItemRow): boolean
	{
		return this.rateFormatter.isZero(row.net);
	}

	public netText(row: ItemRow): string
	{
		if (this.isBalanced(row)) {
			return this.rateFormatter.rate(0, row.item);
		}
		const rate = this.rateFormatter.rate(row.net, row.item);
		return row.net > 0 ? `+${rate}` : rate;
	}

	private filterRows(rows: ItemRow[], term: string): ItemRow[]
	{
		if (term === '') {
			return rows;
		}
		const matching: ItemRow[] = [];
		rows.forEach(row => {
			if (row.item.name.toLowerCase().includes(term)) {
				matching.push(row);
				return;
			}
			const sources = row.sources.filter(flow => flow.name.toLowerCase().includes(term));
			const targets = row.targets.filter(flow => flow.name.toLowerCase().includes(term));
			if (sources.length > 0 || targets.length > 0) {
				matching.push({...row, sources, targets});
			}
		});
		return matching;
	}

}
