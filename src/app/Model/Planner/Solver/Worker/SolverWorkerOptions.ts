/** Per-solve HiGHS option overrides passed to the worker. */
export interface SolverWorkerOptions
{
	/** Allowed relative deviation from the optimal objective for MIP solves (sloops). */
	mipRelGap?: number;
}
