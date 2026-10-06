import {Injectable, Optional} from '@angular/core';
import {env} from '@env/env';
import {DesktopBridge} from '@src/Model/Desktop/DesktopBridge';

@Injectable({providedIn: 'root'})
export class IconUrlService
{

	private readonly base: string;

	public constructor(@Optional() desktop: DesktopBridge | null)
	{
		this.base = desktop === null ? `${env.apiUrl}/data/images` : desktop.info.imageBase;
	}

	public url(hash: string | null | undefined, size: 64 | 256): string | null
	{
		// Some icon fields (schematics in particular) carry raw UE brush
		// strings instead of hashes; anything not filename-safe has no image.
		if (!hash || /[^A-Za-z0-9_-]/.test(hash)) {
			return null;
		}
		return `${this.base}/${size}/${hash}.png`;
	}

}
