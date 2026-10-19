export interface ApiCall
{

	readonly time: Date;

	readonly method: string;

	readonly url: string;

	readonly status: number;

	/** The shape of a successful body, or the whole (shortened) body of a failed one. */
	readonly response: string;

}
