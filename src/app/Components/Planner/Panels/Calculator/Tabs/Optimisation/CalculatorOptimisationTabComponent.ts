import {Component, OnDestroy, ChangeDetectionStrategy, computed} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {Subscription} from 'rxjs';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faXmark} from '@fortawesome/free-solid-svg-icons';
import {InfoNoteComponent} from '@src/Components/Common/InfoNoteComponent';
import {ItemPickerComponent} from '@src/Components/Common/ItemPickerComponent';
import {ItemPickerOption} from '@src/Components/Common/ItemPickerOption';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {MachineCountingMode} from '@src/Model/Planner/MachineCountingMode';
import {MachineWeight} from '@src/Model/Planner/MachineWeight';
import {MachineCountingOption} from '@src/Components/Planner/Panels/Calculator/Tabs/Optimisation/MachineCountingOption';
import {OptimisationDefaults} from '@src/Model/Planner/OptimisationDefaults';
import {OptimisationSettings} from '@src/Model/Planner/OptimisationSettings';
import {PlanManager} from '@src/Model/Planner/PlanManager';

@Component({
	selector: 'calculator-optimisation-tab',
	templateUrl: './CalculatorOptimisationTabComponent.html',
	changeDetection: ChangeDetectionStrategy.Eager,
	imports: [FaIconComponent, InfoNoteComponent, ItemPickerComponent],
})
export class CalculatorOptimisationTabComponent implements OnDestroy
{

	public readonly faXmark = faXmark;

	public readonly machineCountingOptions: MachineCountingOption[] = [
		{value: 'fractional', label: 'Partial machines', description: '2.4 machines count as 2.4.'},
		{value: 'whole', label: 'Whole machines', description: 'Every started machine counts, so 2.4 machines count as 3.'},
	];

	public machineWeightRows: MachineWeight[] = [];

	private loadedOwnerId: string | null = null;
	private readonly subscription = new Subscription();

	private readonly ownerId = computed(() =>
		this.planManager.activePlan()?.id ?? this.planManager.activeFolder()?.id ?? null);

	public constructor(
		private readonly planManager: PlanManager,
		private readonly versionManager: VersionManager,
	)
	{
		this.loadedOwnerId = this.ownerId();
		this.loadMachineWeightRows();

		this.subscription.add(
			toObservable(this.ownerId).subscribe(ownerId => {
				if (ownerId === this.loadedOwnerId) return;
				this.loadedOwnerId = ownerId;
				this.loadMachineWeightRows();
			}),
		);
	}

	public get resourcesEnabled(): boolean
	{
		return this.optimisation()?.rawResources ?? true;
	}

	public get inputsEnabled(): boolean
	{
		return this.optimisation()?.inputs ?? true;
	}

	public get powerEnabled(): boolean
	{
		return this.optimisation()?.power ?? true;
	}

	public get machinesEnabled(): boolean
	{
		return this.optimisation()?.machines ?? false;
	}

	/** Input weights only count as a goal once the plan has inputs, so they do not silence the warning. */
	public get noneEnabled(): boolean
	{
		return !this.resourcesEnabled && !this.powerEnabled && !this.machinesEnabled && !(this.inputsEnabled && this.hasInputs);
	}

	public get hasInputs(): boolean
	{
		return (this.planManager.activePlan()?.inputs ?? []).some(input => input.itemClassName !== '' && input.amount > 0);
	}

	public get powerWeight(): number
	{
		return this.optimisation()?.powerWeight ?? OptimisationDefaults.powerWeight;
	}

	public get machinesWeight(): number
	{
		return this.optimisation()?.machinesWeight ?? OptimisationDefaults.machinesWeight;
	}

	public get machineCounting(): MachineCountingMode
	{
		return this.optimisation()?.machineCounting ?? 'fractional';
	}

	public get machineWeightOptions(): ItemPickerOption[]
	{
		const data = this.versionManager.activeVersionData();
		if (!data) return [];
		return [...data.getProductionMachines(), ...data.getPowerGenerators()]
			.sort((a, b) => a.name.localeCompare(b.name))
			.map(machine => ({
				value: machine.className,
				label: machine.name,
				iconHash: machine.icon,
			}));
	}

	public setMachineCounting(mode: MachineCountingMode): void
	{
		this.update({machineCounting: mode === 'fractional' ? undefined : mode});
	}

	public onMachineWeightMachineChange(row: MachineWeight, value: string): void
	{
		row.machineClassName = value;
		this.syncMachineWeights();
	}

	public onMachineWeightChange(row: MachineWeight, value: number): void
	{
		if (!isFinite(value) || value < 0) return;
		row.weight = value;
		this.syncMachineWeights();
	}

	public addMachineWeightRow(): void
	{
		this.machineWeightRows.push(this.blankMachineWeightRow());
	}

	public removeMachineWeightRow(index: number): void
	{
		this.machineWeightRows.splice(index, 1);
		if (this.machineWeightRows.length === 0) {
			this.machineWeightRows.push(this.blankMachineWeightRow());
		}
		this.syncMachineWeights();
	}

	public toggleResources(): void
	{
		this.update({rawResources: !this.resourcesEnabled});
	}

	public toggleInputs(): void
	{
		this.update({inputs: !this.inputsEnabled});
	}

	public togglePower(): void
	{
		this.update({power: !this.powerEnabled});
	}

	public toggleMachines(): void
	{
		this.update({machines: !this.machinesEnabled});
	}

	public setPowerWeight(value: number): void
	{
		if (isFinite(value) && value >= 0) {
			this.update({powerWeight: value});
		}
	}

	public setMachinesWeight(value: number): void
	{
		if (isFinite(value) && value >= 0) {
			this.update({machinesWeight: value});
		}
	}

	public ngOnDestroy(): void
	{
		this.subscription.unsubscribe();
	}

	private loadMachineWeightRows(): void
	{
		const overrides = this.optimisation()?.machineWeights ?? [];
		this.machineWeightRows = overrides.length > 0
			? overrides.map(row => ({...row}))
			: [this.blankMachineWeightRow()];
	}

	private blankMachineWeightRow(): MachineWeight
	{
		return {machineClassName: '', weight: this.machinesWeight};
	}

	private syncMachineWeights(): void
	{
		const overrides = this.machineWeightRows
			.filter(row => row.machineClassName !== '')
			.map(row => ({...row}));
		this.update({machineWeights: overrides.length > 0 ? overrides : undefined});
	}

	private optimisation(): OptimisationSettings | undefined
	{
		return this.planManager.activeSettings()?.optimisation;
	}

	private update(partial: Partial<OptimisationSettings>): void
	{
		const settings = this.planManager.activeSettings();
		if (!settings) return;
		this.planManager.updateActiveSettings({
			...settings,
			optimisation: {
				// Persist the effective flags explicitly so a partial edit never flips the absent-means-default fields by accident.
				rawResources: this.resourcesEnabled,
				power: this.powerEnabled,
				machines: this.machinesEnabled,
				inputs: this.inputsEnabled,
				...settings.optimisation,
				...partial,
			},
		});
	}

}
