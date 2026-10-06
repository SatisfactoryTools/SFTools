import {OldProductionRequestInput} from '@src/Model/OldTools/OldProductionRequestInput';
import {OldProductionRequestItem} from '@src/Model/OldTools/OldProductionRequestItem';

export interface OldProductionRequest
{
	readonly resourceMax: Record<string, number>;
	readonly resourceWeight: Record<string, number>;
	readonly blockedResources: string[];
	readonly blockedRecipes: string[];
	/** Absent in exports predating machine blocking. */
	readonly blockedMachines?: string[];
	readonly allowedAlternateRecipes: string[];
	readonly sinkableResources: string[];
	readonly production: OldProductionRequestItem[];
	readonly input: OldProductionRequestInput[];
}
