/** Child row of a power panel building row - one recipe (or generator fuel). */
export interface PowerEntryRow
{

	readonly key: string;

	readonly name: string;

	/** Machine count backing this entry (fractional for generators). */
	readonly machines: number;

	/** Machine group summary ("2@100% + 1@50%+1S"); empty when not applicable. */
	readonly detail: string;

	/** Signed MW: positive is consumption, negative is production. */
	readonly megawatts: number;

}
