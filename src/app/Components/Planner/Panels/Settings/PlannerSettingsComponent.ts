import {Component, ChangeDetectionStrategy, Signal, computed, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faCaretDown, faCaretRight} from '@fortawesome/free-solid-svg-icons';
import {Building} from '@src/Model/Data/Entities/Building';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {GraphDirection} from '@src/Model/Planner/GraphDirection';
import {GraphEdgeShape} from '@src/Model/Planner/GraphEdgeShape';
import {GraphLayoutDefaults} from '@src/Model/Planner/GraphLayoutDefaults';
import {GraphLayoutSettings} from '@src/Model/Planner/GraphLayoutSettings';
import {GroupingMode} from '@src/Model/Planner/GroupingMode';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';

@Component({
	selector: 'planner-settings',
	changeDetection: ChangeDetectionStrategy.Eager,
	templateUrl: './PlannerSettingsComponent.html',
	imports: [FormsModule, FaIconComponent],
})
export class PlannerSettingsComponent
{

	public readonly faCaretDown = faCaretDown;
	public readonly faCaretRight = faCaretRight;

	public readonly activePlan: Signal<Plan | null>;
	public readonly graphSettings: Signal<GraphLayoutSettings>;

	private readonly collapsedSignal = signal(new Set<string>());

	public constructor(
		private readonly planManager: PlanManager,
		private readonly versionManager: VersionManager,
		private readonly settings: SettingsManager,
	)
	{
		this.activePlan = planManager.activePlan;
		this.graphSettings = computed(() => GraphLayoutDefaults.resolve(this.activePlan()?.settings.graph));
	}

	/** Machines used by at least one recipe in the active version, sorted by name. */
	public get machines(): Building[]
	{
		const data = this.versionManager.activeVersionData();
		if (!data) {
			return [];
		}
		const seen = new Set<string>();
		const machines: Building[] = [];
		data.recipes.forEach(recipe => recipe.producedIn.forEach(machine => {
			if (!seen.has(machine.className)) {
				seen.add(machine.className);
				machines.push(machine);
			}
		}));
		return machines.sort((a, b) => a.name.localeCompare(b.name));
	}

	public isMachineEnabled(machine: Building): boolean
	{
		return machine.className in this.graphSettings().machineColors;
	}

	public machineColor(machine: Building): string
	{
		return this.graphSettings().machineColors[machine.className] ?? this.settings.graph().nodeColors.recipe;
	}

	/** Adds the machine (seeded with the default recipe colour) or removes its override. */
	public setMachineEnabled(machine: Building, enabled: boolean): void
	{
		const machineColors = {...this.graphSettings().machineColors};
		if (enabled) {
			machineColors[machine.className] = this.settings.graph().nodeColors.recipe;
		} else {
			delete machineColors[machine.className];
		}
		this.patchGraphSettings({machineColors});
	}

	public setMachineColor(machine: Building, color: string): void
	{
		this.patchGraphSettings({machineColors: {...this.graphSettings().machineColors, [machine.className]: color}});
	}

	public isOpen(section: string): boolean
	{
		return !this.collapsedSignal().has(section);
	}

	public toggleSection(section: string): void
	{
		this.collapsedSignal.update(set => {
			const next = new Set(set);
			next.has(section) ? next.delete(section) : next.add(section);
			return next;
		});
	}

	public get defaultGroupingMode(): GroupingMode
	{
		return this.activePlan()?.settings.defaultGroupingMode ?? 'underclock-last';
	}

	/** New nodes (manual or solver-built) start with this machine-group arrangement. */
	public setDefaultGroupingMode(mode: GroupingMode): void
	{
		const plan = this.activePlan();
		if (plan) {
			this.planManager.setSettings(plan.id, {...plan.settings, defaultGroupingMode: mode});
		}
	}

	public setDirection(direction: GraphDirection): void
	{
		this.patchGraphSettings({direction});
	}

	public setEdgeShape(edgeShape: GraphEdgeShape): void
	{
		this.patchGraphSettings({edgeShape});
	}

	/** Range inputs emit strings through ngModel - coerce before storing. */
	public setNodeSpacing(value: number | string): void
	{
		this.patchGraphSettings({nodeSpacing: this.toSpacing(value, GraphLayoutDefaults.SETTINGS.nodeSpacing)});
	}

	public setLayerSpacing(value: number | string): void
	{
		this.patchGraphSettings({layerSpacing: this.toSpacing(value, GraphLayoutDefaults.SETTINGS.layerSpacing)});
	}

	private toSpacing(value: number | string, fallback: number): number
	{
		const parsed = Number(value);
		return Number.isFinite(parsed) ? Math.min(200, Math.max(0, parsed)) : fallback;
	}

	private patchGraphSettings(changes: Partial<GraphLayoutSettings>): void
	{
		const plan = this.activePlan();
		if (!plan) {
			return;
		}
		this.planManager.setSettings(plan.id, {
			...plan.settings,
			graph: {...GraphLayoutDefaults.resolve(plan.settings.graph), ...changes},
		});
	}

}
