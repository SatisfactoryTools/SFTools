export interface OptimisationTarget
{

	rawResources: {[key: string]: number};
	machines: number;
	/** Overrides of the machines weight, by building class. */
	machineWeights: Record<string, number>;
	wholeMachines: boolean;
	power: number;
	inputs: boolean;

}
