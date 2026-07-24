/** An item supplied as a free input to an old-tools production line. */
export interface OldProductionRequestInput
{
	readonly item: string | null;
	readonly amount: number;
}
