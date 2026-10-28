/**
 * Custom version files are content-addressed, so the browser may keep them. Official ones are rewritten in place
 * (publish, world:attach): the browser has to ask again, else a copy from before the change can stay for days.
 */
export class VersionFileCaching
{

	private static readonly CUSTOM_DIR = 'data/versions/custom/';

	public static mode(dataPath: string): RequestCache
	{
		return dataPath.startsWith(VersionFileCaching.CUSTOM_DIR) ? 'default' : 'no-cache';
	}

}
