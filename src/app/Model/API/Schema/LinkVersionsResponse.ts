/** Response of POST /v1/versions/link - which ids got linked to the account. */
export interface LinkVersionsResponse
{

	/** Linked now or already linked before (the call is idempotent). */
	linked: string[];
	/** Invalid, unknown, or not custom versions - drop these from localStorage. */
	notFound: string[];

}
