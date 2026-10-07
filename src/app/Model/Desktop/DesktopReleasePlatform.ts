export interface DesktopReleasePlatform
{

	readonly url: string;

	readonly signature: string;

	/** Bytes; missing in manifests published before sizes were recorded. */
	readonly size?: number;

}
