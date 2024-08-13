/** One raw resource in the limits table; infinite rows keep their last typed limit locally. */
export interface ResourceLimitRow
{
	readonly className: string;
	readonly name: string;
	limit: number;
	infinite: boolean;
}
