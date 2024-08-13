/** One choice of an enum field (value is what lands in the JSON). */
export interface ModFieldOption
{
	readonly value: string | number;
	readonly label: string;
}
