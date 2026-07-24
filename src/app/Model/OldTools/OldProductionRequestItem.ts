/**
 * A requested output of an old-tools production line. `type` is 'perMinute'
 * (produce `amount` per minute) or 'max' (maximise, with `ratio` splitting
 * the leftovers between the max rows).
 */
export interface OldProductionRequestItem
{
	readonly item: string | null;
	readonly type: string;
	readonly amount: number;
	readonly ratio: number;
}
