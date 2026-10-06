import {Component, ChangeDetectionStrategy, Signal, computed, signal} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faChevronDown, faChevronRight} from '@fortawesome/free-solid-svg-icons';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {BuildCostBreakdown} from '@src/Model/Planner/Breakdown/BuildCostBreakdown';
import {BuildCostMaterialRow} from '@src/Model/Planner/Breakdown/BuildCostMaterialRow';
import {BuildCostRow} from '@src/Model/Planner/Breakdown/BuildCostRow';
import {PlanBreakdownService} from '@src/Model/Planner/Breakdown/PlanBreakdownService';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {SpecialClasses} from '@src/Model/Planner/SpecialClasses';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {RateFormatter} from '@src/Model/RateFormatter';

@Component({
	selector: 'planner-build-cost',
	changeDetection: ChangeDetectionStrategy.Eager,
	templateUrl: './PlannerBuildCostComponent.html',
	imports: [FaIconComponent, GameIconComponent, InfoNoteComponent],
})
export class PlannerBuildCostComponent
{

	public readonly faChevronDown = faChevronDown;
	public readonly faChevronRight = faChevronRight;

	private readonly searchTermSignal = signal('');
	public readonly searchTerm = this.searchTermSignal.asReadonly();

	private readonly expandedKeysSignal = signal<ReadonlySet<string>>(new Set());

	public readonly isFolderView = computed(() => this.planManager.activeFolder() !== null);

	public readonly breakdown: Signal<BuildCostBreakdown> = computed(() => {
		const folder = this.planManager.activeFolder();
		return folder
			? this.breakdownService.buildCostForFolder(folder.id)
			: this.breakdownService.buildCost(this.planManager.activePlan());
	});

	public readonly rows: Signal<BuildCostRow[]> = computed(() =>
		this.filterRows(this.breakdown().rows, this.searchTerm().trim().toLowerCase()));

	public readonly totalMaterials: Signal<BuildCostMaterialRow[]> = computed(() => {
		const term = this.searchTerm().trim().toLowerCase();
		const materials = this.breakdown().materials;
		return term === '' ? materials : materials.filter(material => material.item.name.toLowerCase().includes(term));
	});

	public readonly hasRows = computed(() => this.breakdown().rows.length > 0);

	public readonly shardIcon = computed(() =>
		this.versionManager.activeVersionData()?.iconForClassName(SpecialClasses.PowerShardItem) ?? null);
	public readonly sloopIcon = computed(() =>
		this.versionManager.activeVersionData()?.iconForClassName(SpecialClasses.SomersloopItem) ?? null);

	public constructor(
		private readonly planManager: PlanManager,
		private readonly breakdownService: PlanBreakdownService,
		private readonly versionManager: VersionManager,
		public readonly rateFormatter: RateFormatter,
	)
	{
	}

	public setSearchTerm(value: string): void
	{
		this.searchTermSignal.set(value);
	}

	public isExpanded(row: BuildCostRow): boolean
	{
		return row.materials.length > 0
			&& (this.searchTerm().trim() !== '' || this.expandedKeysSignal().has(row.key));
	}

	public toggle(row: BuildCostRow): void
	{
		if (row.materials.length === 0) {
			return;
		}
		const keys = new Set(this.expandedKeysSignal());
		keys.has(row.key) ? keys.delete(row.key) : keys.add(row.key);
		this.expandedKeysSignal.set(keys);
	}

	private filterRows(rows: BuildCostRow[], term: string): BuildCostRow[]
	{
		if (term === '') {
			return rows;
		}
		const matching: BuildCostRow[] = [];
		rows.forEach(row => {
			if (row.name.toLowerCase().includes(term)) {
				matching.push(row);
				return;
			}
			const materials = row.materials.filter(material => material.item.name.toLowerCase().includes(term));
			if (materials.length > 0) {
				matching.push({...row, materials});
			}
		});
		return matching;
	}

}
