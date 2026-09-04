/** One raw resource in the limits table; infinite rows keep their last typed limit locally. */
export interface ResourceLimitRow
{
	readonly className: string;
	readonly name: string;
	/** Off = the solver may not mine the resource at all; the limit is kept but ignored. */
	enabled: boolean;
	limit: number;
	infinite: boolean;
	/** Optimisation weight per unit mined - editable in manual mode, computed otherwise (rounded). */
	weight: number;
}
