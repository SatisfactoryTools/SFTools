/** Raised when a recipe node's built machines cannot reach its target. */
export interface GraphNodeCapacityWarning
{

	/** Machine-equivalents at 100% clock the target needs. */
	readonly target: number;

	/** Machine-equivalents at 100% clock the machine groups provide. */
	readonly capacity: number;

}
