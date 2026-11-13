/** Mirrors tools-api FicsitAppClient::parseLink. */
export class FicsitModLink
{

	public static readonly EXAMPLE = 'https://ficsit.app/mod/RocketFuelRebalancePatch';

	private static readonly PATTERN = /^(?:https?:\/\/)?(?:www\.)?ficsit\.app\/mod\/([A-Za-z0-9_]{1,64})\/?(?:[/?#].*)?$/i;

	public static parse(link: string): string | null
	{
		return FicsitModLink.PATTERN.exec(link.trim())?.[1] ?? null;
	}

	public static url(reference: string): string
	{
		return `https://ficsit.app/mod/${encodeURIComponent(reference)}`;
	}

}
