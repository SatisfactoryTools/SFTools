export interface GraphSnapshot
{

	readonly planId: string;
	/** JSON.stringify of the plan's graph (via Node.toJSON), or null when the plan had no graph. */
	readonly graphJson: string | null;

}
