import {MachineCountingMode} from '@src/Model/Planner/MachineCountingMode';
import {MachineWeight} from '@src/Model/Planner/MachineWeight';

export interface OptimisationSettings
{

	readonly rawResources?: boolean;
	readonly power?: boolean;
	readonly machines?: boolean;
	readonly inputs?: boolean;
	/** @deprecated Moved to PlanSettings.resourceWeights; only read by PlanSettingsNormalizer. */
	readonly resourceWeights?: Record<string, number>;
	readonly powerWeight?: number;
	readonly machinesWeight?: number;
	/** Absent = 'fractional'; 'whole' rounds every machine column up, which turns the model into a MIP. */
	readonly machineCounting?: MachineCountingMode;
	/** Per machine or generator; anything not listed costs machinesWeight. */
	readonly machineWeights?: MachineWeight[];

}
