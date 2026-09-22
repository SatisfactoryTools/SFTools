/**
 * The outcome of a backend load. A failure and an empty store both arrive as
 * "no data", but they must not be treated alike: reading a failure as "nothing
 * stored" is what lets client-side defaults overwrite what the server still
 * holds.
 */
export interface LoadResult<T>
{
	ok: boolean;
	data: T | null;
}
