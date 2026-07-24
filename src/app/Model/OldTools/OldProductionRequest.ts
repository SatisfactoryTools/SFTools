import {OldProductionRequestInput} from '@src/Model/OldTools/OldProductionRequestInput';
import {OldProductionRequestItem} from '@src/Model/OldTools/OldProductionRequestItem';

/**
 * The solver request of an old-tools production line. All identifiers are
 * game class names (Desc_*_C / Recipe_*_C). Standard recipes are enabled
 * unless listed in blockedRecipes; alternates are disabled unless listed in
 * allowedAlternateRecipes.
 */
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
