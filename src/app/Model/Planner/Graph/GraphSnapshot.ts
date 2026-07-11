export interface GraphSnapshot
{

	readonly planId: string;
	/** JSON.stringify of the plan's graph (via Node.toJSON), or null when the plan had no graph. */
	readonly graphJson: string | null;
	/**
	 * JSON.stringify of the plan's descendant subplan entities (Plan[]) at
	 * snapshot time. Undo/redo reconciles the store against it, so subplans
	 * deleted or created by the banked operation reappear or vanish together
	 * with their node - in the plans panel and on the API.
	 */
	readonly subplansJson: string;

}
