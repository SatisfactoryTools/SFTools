import {Component, Signal, computed, signal, ChangeDetectionStrategy} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {TooltipDirective} from 'ngx-bootstrap/tooltip';
import {
	faBolt,
	faCopy,
	faGaugeHigh,
	faListCheck,
	faMountain,
	faPlay,
	faRecycle,
	faRightToBracket,
	faRotateLeft,
	faScroll,
	faSitemap,
	faSliders,
	faWandMagicSparkles,
	faXmark,
} from '@fortawesome/free-solid-svg-icons';
import {CalculationModeOption} from '@src/Components/Planner/Panels/Calculator/CalculationModeOption';
import {CalculatorTab} from '@src/Components/Planner/Panels/Calculator/CalculatorTab';
import {CalculatorTabDefinition} from '@src/Components/Planner/Panels/Calculator/CalculatorTabDefinition';
import {CalculatorOptimisationTabComponent} from '@src/Components/Planner/Panels/Calculator/Tabs/Optimisation/CalculatorOptimisationTabComponent';
import {CalculatorOverclockingTabComponent} from '@src/Components/Planner/Panels/Calculator/Tabs/Overclocking/CalculatorOverclockingTabComponent';
import {CalculatorPowerTabComponent} from '@src/Components/Planner/Panels/Calculator/Tabs/Power/CalculatorPowerTabComponent';
import {CalculatorInputTabComponent} from '@src/Components/Planner/Panels/Calculator/Tabs/Input/CalculatorInputTabComponent';
import {CalculatorProductionTabComponent} from '@src/Components/Planner/Panels/Calculator/Tabs/Production/CalculatorProductionTabComponent';
import {CalculatorRecipesTabComponent} from '@src/Components/Planner/Panels/Calculator/Tabs/Recipes/CalculatorRecipesTabComponent';
import {CalculatorResourcesTabComponent} from '@src/Components/Planner/Panels/Calculator/Tabs/Resources/CalculatorResourcesTabComponent';
import {CalculatorSinkTabComponent} from '@src/Components/Planner/Panels/Calculator/Tabs/Sink/CalculatorSinkTabComponent';
import {CalculatorSloopsTabComponent} from '@src/Components/Planner/Panels/Calculator/Tabs/Sloops/CalculatorSloopsTabComponent';
import {PlannerActionsService} from '@src/Components/Planner/PlannerActionsService';
import {CalculationMode} from '@src/Model/Planner/CalculationMode';
import {Folder} from '@src/Model/Planner/Folder';
import {Plan} from '@src/Model/Planner/Plan';
import {PlanManager} from '@src/Model/Planner/PlanManager';
import {PlanSettings} from '@src/Model/Planner/PlanSettings';

@Component({
	selector: 'planner-calculator',
	templateUrl: './CalculatorComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [
		BsDropdownModule,
		CalculatorInputTabComponent,
		CalculatorOptimisationTabComponent,
		CalculatorOverclockingTabComponent,
		CalculatorPowerTabComponent,
		CalculatorProductionTabComponent,
		CalculatorRecipesTabComponent,
		CalculatorResourcesTabComponent,
		CalculatorSinkTabComponent,
		CalculatorSloopsTabComponent,
		FaIconComponent,
		TooltipDirective,
	],
	styles: [`
		.req-controls {
			display: flex;
			align-items: center;
			gap: 8px;
			padding: 8px 10px 0;
		}
		.calc-tabs {
			padding: 8px 10px 0;
		}
		.calc-tabs .nav-link {
			padding: 4px 14px;
			cursor: pointer;
		}
	`],
})
export class CalculatorComponent
{

	public readonly faCopy = faCopy;
	public readonly faPlay = faPlay;
	public readonly faRotateLeft = faRotateLeft;
	public readonly faSitemap = faSitemap;
	public readonly faXmark = faXmark;

	private readonly activeTabSignal = signal<CalculatorTab>('request');
	public readonly activeTab: Signal<CalculatorTab> = this.activeTabSignal.asReadonly();

	public readonly tabs: CalculatorTabDefinition[] = [
		{id: 'request', label: 'Request', icon: faListCheck},
		{id: 'input', label: 'Input', icon: faRightToBracket},
		{id: 'recipes', label: 'Recipes', icon: faScroll},
		{id: 'resources', label: 'Resources', icon: faMountain},
		{id: 'power', label: 'Power', icon: faBolt},
		{id: 'sink', label: 'Sink', icon: faRecycle},
		{id: 'sloops', label: 'Sloops', icon: faWandMagicSparkles},
		{id: 'overclocking', label: 'Overclocking', icon: faGaugeHigh},
		{id: 'optimisation', label: 'Optimisation', icon: faSliders},
	];

	public readonly modeOptions: CalculationModeOption[] = [
		{mode: 'automatic', label: 'Automatic', description: 'Recalculates as the request changes'},
		{mode: 'manual-fresh', label: 'Manual (fresh)', description: 'Replaces the current graph'},
		{mode: 'manual-upgrade', label: 'Manual (upgrade)', description: 'Merges into the current graph, summing matching nodes'},
		{mode: 'manual-append', label: 'Manual (append)', description: 'Adds beside the current graph without merging'},
	];

	public readonly activePlan: Signal<Plan | null>;
	public readonly activeFolder: Signal<Folder | null>;
	public readonly mode: Signal<CalculationMode>;
	public readonly graphDirty: Signal<boolean>;
	public readonly buttonLabel: Signal<string>;
	public readonly hasGraph: Signal<boolean>;

	/** Custom settings enabled on the active folder - its tabs are editable. */
	public readonly folderHasCustomSettings: Signal<boolean>;

	/** Display name of whatever the active plan/folder would inherit settings from. */
	public readonly parentLabel: Signal<string>;

	public readonly modeLabel: Signal<string>;

	public constructor(
		private readonly planManager: PlanManager,
		public readonly actions: PlannerActionsService,
	)
	{
		this.activePlan = planManager.activePlan;
		this.activeFolder = planManager.activeFolder;
		this.graphDirty = planManager.activePlanGraphDirty;
		// Plans saved before calculation modes existed have no mode - treat them as automatic.
		this.mode = computed(() => this.planManager.activeSettings()?.calculationMode ?? 'automatic');
		this.modeLabel = computed(() =>
			this.modeOptions.find(option => option.mode === this.mode())?.label ?? 'Automatic');
		this.buttonLabel = computed(() => {
			switch (this.mode()) {
				case 'manual-fresh': return 'Calculate';
				case 'manual-upgrade': return 'Calculate (upgrade)';
				case 'manual-append': return 'Calculate (append)';
				default: return this.graphDirty() ? 'Resume auto' : 'Automatic';
			}
		});
		this.hasGraph = computed(() => (this.activePlan()?.graph?.nodes.length ?? 0) > 0);
		this.folderHasCustomSettings = computed(() => (this.activeFolder()?.settings ?? null) !== null);
		this.parentLabel = computed(() => {
			const plan = this.activePlan();
			if (plan?.parentPlanId) {
				const parent = this.planManager.plans().find(p => p.id === plan.parentPlanId);
				if (parent) {
					return `"${parent.name}"`;
				}
			}
			const folderId = plan ? plan.folderId : this.activeFolder()?.parentId ?? null;
			const folder = this.planManager.folders().find(f => f.id === folderId);
			return folder ? `"${folder.name}"` : 'the defaults';
		});
	}

	public setTab(tab: CalculatorTab): void
	{
		this.activeTabSignal.set(tab);
	}

	public relayout(): void
	{
		this.actions.requestRelayout();
	}

	public setMode(mode: CalculationMode): void
	{
		const settings = this.planManager.activeSettings();
		if (settings) {
			this.planManager.updateActiveSettings({...settings, calculationMode: mode});
		}
	}

	public calculate(): void
	{
		const plan = this.activePlan();
		if (!plan) return;
		// The dirty flag is cleared by the solve completing, not here - a
		// failed or cancelled solve keeps the plan paused, and undo snapshots
		// taken before the solve keep the correct dirty state.
		if (this.graphDirty() && !this.actions.confirmGraphOverwrite()) {
			return;
		}
		this.actions.requestCalculate();
	}

	public cancel(): void
	{
		this.actions.requestCancel();
	}

	public resetSettings(): void
	{
		if (!confirm('Reset all solver settings (mode, recipes, resources, power) to the defaults?')) {
			return;
		}
		this.planManager.updateActiveSettings(this.planManager.defaultSettings());
	}

	public inheritSettings(): void
	{
		if (!confirm(`Replace all solver settings with those of ${this.parentLabel()}?`)) {
			return;
		}
		this.planManager.updateActiveSettings(this.parentSettings());
	}

	/** Turns on custom settings, starting from what the folder currently inherits. */
	public enableFolderSettings(): void
	{
		const folder = this.activeFolder();
		if (folder) {
			this.planManager.setFolderSettings(folder.id, this.planManager.effectiveFolderSettings(folder.id));
		}
	}

	public disableFolderSettings(): void
	{
		const folder = this.activeFolder();
		if (!folder || !confirm('Remove this folder\'s custom settings? It will inherit from its parent again.')) {
			return;
		}
		this.planManager.setFolderSettings(folder.id, null);
	}

	public createPlanInFolder(): void
	{
		const folder = this.activeFolder();
		if (folder) {
			const plan = this.planManager.createPlan('', folder.id);
			this.planManager.setActivePlan(plan.id);
		}
	}

	/** What the active plan/folder would inherit: parent plan, else the folder chain. */
	private parentSettings(): PlanSettings
	{
		const plan = this.activePlan();
		if (plan?.parentPlanId) {
			const parent = this.planManager.plans().find(p => p.id === plan.parentPlanId);
			if (parent) {
				return this.planManager.cloneSettings(parent.settings);
			}
		}
		const folderId = plan ? plan.folderId : this.activeFolder()?.parentId ?? null;
		return this.planManager.effectiveFolderSettings(folderId);
	}

}
