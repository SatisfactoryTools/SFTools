import {VisitedShare} from '@src/Model/Shares/VisitedShare';

/**
 * The list holds at most this many entries; inserting beyond it evicts the
 * oldest visit. The server enforces the same constant on PUT.
 */
export const VISITED_SHARES_CAP = 20;

/** The synced "Shared plans" list, most recently visited first. */
export interface VisitedShareStore
{
	readonly shares: VisitedShare[];
}
