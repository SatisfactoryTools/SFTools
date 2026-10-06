export interface ResourceLimitRow
{
	readonly className: string;
	readonly name: string;
	enabled: boolean;
	limit: number;
	infinite: boolean;
	weight: number;
}
