import {env} from '@env/env';

export class AppLinks
{

	public static readonly SCHEME = 'sftools';

	private static readonly HANDOFF_PATHS = [/^\/shared\/[^/]+/, /^\/[^/]+\/planner\/[^/]+/];

	public static webUrl(path: string): string
	{
		return env.webUrl + (path.startsWith('/') ? path : `/${path}`);
	}

	public static desktopUrl(path: string): string
	{
		return `${AppLinks.SCHEME}://${path.replace(/^\/+/, '')}`;
	}

	/** `sftools://shared/abc` parses with "shared" as its host. */
	public static pathOf(link: string): string | null
	{
		let url: URL;
		try {
			url = new URL(link.trim());
		} catch {
			return null;
		}
		if (url.protocol === `${AppLinks.SCHEME}:`) {
			const path = `/${url.host}${url.pathname}`.replace(/\/{2,}/g, '/').replace(/(.)\/$/, '$1');
			return path + url.search + url.hash;
		}
		if ((url.protocol === 'https:' || url.protocol === 'http:') && AppLinks.isWebsiteHost(url.host)) {
			return url.pathname + url.search + url.hash;
		}
		return null;
	}

	public static isHandoffPath(path: string): boolean
	{
		return AppLinks.HANDOFF_PATHS.some(pattern => pattern.test(path));
	}

	private static isWebsiteHost(host: string): boolean
	{
		return host === new URL(env.webUrl).host
			|| host === 'satisfactorytools.com'
			|| (host.endsWith('.satisfactorytools.com') && !host.startsWith('api.'));
	}

}
