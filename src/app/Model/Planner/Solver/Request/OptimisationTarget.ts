export interface OptimisationTarget
{

	/** Per-resource mining weights; an empty map disables resource optimisation. */
	rawResources: {[key: string]: number};
	/** Weight per machine built; 0 disables. */
	machines: number;
	/** Weight per MW of average machine draw; 0 disables. */
	power: number;

}
