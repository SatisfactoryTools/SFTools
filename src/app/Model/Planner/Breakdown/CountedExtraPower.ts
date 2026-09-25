import {ExtraPower} from '@src/Model/Planner/ExtraPower';

/**
 * One plan's extra power inside a recursive collection: the setup itself,
 * the MW that plan's own generators make (what the augmenters' percentage
 * applies to) and how many times the plan is built.
 */
export interface CountedExtraPower
{

	readonly extraPower: ExtraPower;

	/** MW the plan's own generator nodes make - subplans bring their own entry. */
	readonly generated: number;

	readonly count: number;

}
