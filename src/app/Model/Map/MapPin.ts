/** A saved factory spot. */
export interface MapPin
{
	readonly id: string;
	/** World X/Y. */
	readonly x: number;
	readonly y: number;
	readonly label: string;
	readonly color: string;
	readonly removable: boolean;
}
