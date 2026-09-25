import {Component, ChangeDetectionStrategy, Signal, computed} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {CollapsedSectionsService} from '@src/Components/Common/CollapsedSectionsService';
import {CollapsibleSections} from '@src/Components/Common/CollapsibleSections';
import {CollapsibleCardComponent} from '@src/Components/Common/CollapsibleCardComponent';
import {GameIconComponent} from '@src/Components/Common/GameIconComponent';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {Building} from '@src/Model/Data/Entities/Building';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {Folder} from '@src/Model/Planner/Folder';
import {GraphDirection} from '@src/Model/Planner/GraphDirection';
import {GraphEdgeShape} from '@src/Model/Planner/GraphEdgeShape';
import {GraphLayoutDefaults} from '@src/Model/Planner/GraphLayoutDefaults';
import {GraphLayoutResolver} from '@src/Model/Planner/GraphLayoutResolver';
import {GraphLayoutSettings} from '@src/Model/Planner/GraphLayoutSettings';
import {GroupingMode} from '@src/Model/Planner/GroupingMode';
import {GroupingModeResolver} from '@src/Model/Planner/GroupingModeResolver';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';
import {SettingsManager} from '@src/Model/Settings/SettingsManager';

@Component({
	selector: 'planner-settings',
	changeDetection: ChangeDetectionStrategy.Eager,
	templateUrl: './PlannerSettingsComponent.html',
	imports: [FormsModule, CollapsibleCardComponent, GameIconComponent, InfoNoteComponent],
})
export class PlannerSettingsComponent
{

	public readonly activePlan: Signal<Plan | null>;

	/**
	 * A folder edits the same settings as a plan, and they are the starting
	 * values for the plans and subfolders made inside it - the folder holds a
	 * whole PlanSettings, of which these are the keys no settings group owns.
	 */
	public readonly activeFolder: Signal<Folder | null>;

	/** What the panel edits: the plan's settings, or the folder's custom ones. Null while a folder inherits. */
	public readonly editedSettings: Signal<PlanSettings | null>;

	public readonly graphSettings: Signal<GraphLayoutSettings>;

	/** Where a folder without custom settings takes its values from today. */
	public readonly parentLabel: Signal<string>;

	/** Why the active folder cannot get its own settings (an ancestor fixes them), or null. */
	public readonly customSettingsBlocker: Signal<string | null>;

	/** A shared plan's settings are shown but locked (the write paths are guarded anyway). */
	public readonly readOnly: Signal<boolean>;
	public readonly readOnlyNote: Signal<string>;

	/** Which cards are folded; shared, so a fold survives closing the panel. */
	public readonly foldState: CollapsibleSections;

	public constructor(
		private readonly planManager: PlanManager,
		private readonly versionManager: VersionManager,
		private readonly appSettings: SettingsManager,
		private readonly graphLayout: GraphLayoutResolver,
		private readonly groupingModes: GroupingModeResolver,
		collapsedSections: CollapsedSectionsService,
	)
	{
		this.foldState = new CollapsibleSections(collapsedSections, 'planner-settings');
		this.activePlan = planManager.activePlan;
		this.activeFolder = planManager.activeFolder;
		this.editedSettings = planManager.activeSettings;
		this.readOnly = planManager.activePlanReadOnly;
		this.readOnlyNote = computed(() => planManager.activePlanShared()
			? 'Shared plan - read-only. You can look at the settings but not change them.'
			: 'Plan on this device - read-only. Add it to your plans to change the settings.');
		this.graphSettings = computed(() => graphLayout.resolve(this.editedSettings()?.graph));
		this.parentLabel = computed(() => {
			const folder = this.activeFolder();
			const parent = planManager.folders().find(f => f.id === folder?.parentId);
			return parent ? `folder "${parent.name}"` : 'the defaults';
		});
		this.customSettingsBlocker = computed(() => {
			const folder = this.activeFolder();
			return folder ? planManager.customSettingsBlocker(folder.id) : null;
		});
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
		return this.graphSettings().machineColors[machine.className] ?? this.appSettings.graph().nodeColors.recipe;
	}

	/** Adds the machine (seeded with the default recipe colour) or removes its override. */
	public setMachineEnabled(machine: Building, enabled: boolean): void
	{
		const machineColors = {...this.graphSettings().machineColors};
		if (enabled) {
			machineColors[machine.className] = this.appSettings.graph().nodeColors.recipe;
		} else {
			delete machineColors[machine.className];
		}
		this.patchGraphSettings({machineColors});
	}

	public setMachineColor(machine: Building, color: string): void
	{
		this.patchGraphSettings({machineColors: {...this.graphSettings().machineColors, [machine.className]: color}});
	}

	public get defaultGroupingMode(): GroupingMode
	{
		return this.groupingModes.resolve(this.editedSettings());
	}

	/** New nodes (manual or solver-built) start with this machine-group arrangement. */
	public setDefaultGroupingMode(mode: GroupingMode): void
	{
		const settings = this.editedSettings();
		if (settings) {
			this.planManager.updateActiveSettings({...settings, defaultGroupingMode: mode});
		}
	}

	/** Gives the folder its own settings to edit, copied from what it inherits today. */
	public enableFolderSettings(): void
	{
		const folder = this.activeFolder();
		if (folder) {
			this.planManager.enableFolderSettings(folder.id);
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
		const settings = this.editedSettings();
		if (!settings) {
			return;
		}
		this.planManager.updateActiveSettings({
			...settings,
			graph: {...this.graphLayout.resolve(settings.graph), ...changes},
		});
	}

}
