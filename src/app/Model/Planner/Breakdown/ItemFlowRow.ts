export interface ItemFlowRow
{

	readonly key: string;

	readonly name: string;

	readonly amount: number;

	/** Part of `amount` flowing through nodes marked done. */
	readonly builtAmount: number;

	/** Empty when the row is not on this plan's canvas (folder views, buildings inside subplans). */
	readonly nodeIds: string[];

}
