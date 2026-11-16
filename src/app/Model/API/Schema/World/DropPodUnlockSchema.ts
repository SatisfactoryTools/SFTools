/** What opening a crash site takes: an item amount, a constant power draw in MW, or nothing when both are missing. */
export interface DropPodUnlockSchema
{
	item?: string;
	amount?: number;
	power?: number;
}
