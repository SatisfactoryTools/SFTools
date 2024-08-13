import {Injectable} from '@angular/core';
import {env} from '@env/env';

/**
 * Resolves an icon hash to its image URL. Icons live at
 * {apiUrl}/data/images/{size}/{hash}.png, rendered at either 64px or 256px.
 * The hash comes from the `icon` field on items, buildings and schematics;
 * a null/empty hash yields null so callers can skip rendering.
 */
@Injectable({providedIn: 'root'})
export class IconUrlService
{

	public url(hash: string | null | undefined, size: 64 | 256): string | null
	{
		// Some icon fields (schematics in particular) carry raw UE brush
		// strings instead of hashes; anything not filename-safe has no image.
		if (!hash || /[^A-Za-z0-9_-]/.test(hash)) {
			return null;
		}
		return `${env.apiUrl}/data/images/${size}/${hash}.png`;
	}

}
