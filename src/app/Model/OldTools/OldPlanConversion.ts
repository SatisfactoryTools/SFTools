import {Plan} from '@src/Model/Planner/Plan';

/** An old-tools production line converted to a plan, ready for importTree. */
export interface OldPlanConversion
{
	/** Converted plan, detached (folderId null) - the importer assigns the folder. */
	readonly plan: Plan;
	/** Class names of the source that the active version does not know - their rows were skipped. */
	readonly unknownClassNames: string[];
}
