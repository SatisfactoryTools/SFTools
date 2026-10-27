import {FactorySiteResourceUse} from '@src/Model/Map/FactorySite/FactorySiteResourceUse';

export interface FactorySiteExplanation
{
	readonly x: number;
	readonly y: number;
	/** In the mode's terms, with the fluid factor applied. */
	readonly score: number;
	readonly resources: FactorySiteResourceUse[];
}
