import {Component, computed, ChangeDetectionStrategy, Signal} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faTriangleExclamation} from '@fortawesome/free-solid-svg-icons';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {PlannerActionsService} from '@src/Components/Planner/PlannerActionsService';
import {PlannerGraphService} from '@src/Components/Planner/PlannerGraphService';
import {Formulas} from '@src/Model/Planner/Formulas';
import {GraphWarningEntry} from '@src/Model/Planner/Graph/GraphWarningEntry';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {RateFormatter} from '@src/Model/RateFormatter';
import {RecipeNode} from '@src/Model/Planner/Solver/Response/RecipeNode';
import {SpecialClasses} from '@src/Model/Planner/SpecialClasses';
import {VersionManager} from '@src/Model/Data/VersionManager';

@Component({
	selector: 'planner-status-bar',
	templateUrl: './PlannerStatusBarComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, BsDropdownModule, GameIconComponent],
	styles: [`
		:host {
			display: flex;
			align-items: center;
			gap: 16px;
			width: 100%;
			height: 100%;
			padding: 0 16px;
			background: #10141d;
			border-top: 1px solid #222b3e;
			font-size: 1rem;
			color: #8899bb;
			user-select: none;
		}
		.stat b { color: #dfe5ec; font-weight: 600; }
		.right {
			margin-left: auto;
			display: inline-flex;
			align-items: center;
			gap: 14px;
		}
		.state .dot {
			display: inline-block;
			width: 7px;
			height: 7px;
			border-radius: 50%;
			margin-right: 5px;
			vertical-align: middle;
		}
		.state-solved { color: #7bc98a; }
		.state-solved .dot { background: #4f9d69; }
		.state-modified { color: #e0b56a; }
		.state-modified .dot { background: #c9962e; }
		.state-busy { color: #d0a45e; }
		.state-busy .dot { background: #d0a45e; }
		.state-error { color: #e58a72; }
		.state-error .dot { background: #d4663f; }
		.state-idle .dot { background: #3a4654; }
		.warnings-toggle {
			background: none;
			border: none;
			padding: 0;
			font-size: 1rem;
			color: #e0b56a;
			cursor: pointer;
		}
		.warnings-toggle:hover { color: #f0cd8b; }
	`],
})
export class PlannerStatusBarComponent
{

	public readonly faTriangleExclamation = faTriangleExclamation;

	public readonly buildings = computed(() => {
		let total = 0;
		for (const node of this.graphNodes()) {
			if (node instanceof RecipeNode) {
				total += node.amount;
			}
		}
		return total;
	});

	public readonly powerText = computed(() => {
		let megawatts = 0;
		for (const node of this.graphNodes()) {
			if (node instanceof RecipeNode) {
				megawatts += node.averagePowerUsage();
			}
		}
		if (megawatts === 0) return '-';
		return this.rateFormatter.power(megawatts);
	});

	/** Somersloops slotted across all machine groups of the plan. */
	public readonly sloops = computed(() => {
		let total = 0;
		for (const node of this.graphNodes()) {
			if (node instanceof RecipeNode) {
				node.groups.forEach(group => { total += group.machines * group.sloops; });
			}
		}
		return total;
	});

	/** Power shards needed to run every overclocked machine group. */
	public readonly shards = computed(() => {
		let total = 0;
		for (const node of this.graphNodes()) {
			if (node instanceof RecipeNode) {
				node.groups.forEach(group => { total += group.machines * Formulas.powerShards(group.clockSpeed); });
			}
		}
		return total;
	});

	public readonly sloopIcon = computed(() =>
		this.versionManager.activeVersionData()?.iconForClassName(SpecialClasses.SomersloopItem) ?? null);

	public readonly shardIcon = computed(() =>
		this.versionManager.activeVersionData()?.iconForClassName(SpecialClasses.PowerShardItem) ?? null);

	public readonly hasGraph = computed(() => this.graphNodes().length > 0);

	public readonly warningEntries: Signal<GraphWarningEntry[]>;

	public readonly warningCount = computed(() =>
		this.warningEntries().reduce((sum, entry) => sum + entry.lines.length, 0));

	public readonly graphDirty: Signal<boolean>;

	private readonly graphNodes = computed(() => this.planManager.activePlan()?.graph?.nodes ?? []);

	public constructor(
		private readonly planManager: PlanManager,
		private readonly plannerGraph: PlannerGraphService,
		public readonly actions: PlannerActionsService,
		private readonly rateFormatter: RateFormatter,
		private readonly versionManager: VersionManager,
	)
	{
		this.graphDirty = planManager.activePlanGraphDirty;
		this.warningEntries = plannerGraph.warningEntries;
	}

	public focusWarning(entry: GraphWarningEntry): void
	{
		this.plannerGraph.focusNode(entry.nodeId);
	}

}
