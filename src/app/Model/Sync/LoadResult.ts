/** A failure and an empty store both arrive as "no data" but must stay distinct: reading a failure as "nothing stored" lets client defaults overwrite the server. */
export interface LoadResult<T>
{
	ok: boolean;
	data: T | null;
}
