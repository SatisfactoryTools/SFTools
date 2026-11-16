import {MachineBuildRest} from '@src/Model/Planner/MachineBuildRest';
import {MachineGroup} from '@src/Model/Planner/Solver/Response/MachineGroup';

/** How a recipe node is built: rows the user (or the solver's sloop choice) fixed, plus a rest worked out from the target. */
export interface MachineBuild
{

	readonly pinned: MachineGroup[];

	readonly rest: MachineBuildRest;

	/** Edited in the advanced table: the pinned rows are the whole build and may fall short of the target. */
	readonly custom: boolean;

	/** Custom builds only: the rows the rest had when Automatic was switched off. Switching it back on drops them. */
	readonly manualRest?: MachineGroup[];

}
