/** Node counts by purity; every group always carries all three keys (missing = 0). */
export interface PurityCounts
{
	impure: number;
	normal: number;
	pure: number;
}
