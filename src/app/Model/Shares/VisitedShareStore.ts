import {VisitedShare} from '@src/Model/Shares/VisitedShare';

/** The server enforces the same cap on PUT. */
export const VISITED_SHARES_CAP = 20;

export interface VisitedShareStore
{
	readonly shares: VisitedShare[];
}
