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
		if (!hash || !this.isFilenameSafe(hash)) {
			return null;
		}
		return `${this.base}/${size}/${hash}.png`;
	}

	// No regex: this runs for every icon in every template, and Firefox's regex engine throws "too much recursion" when the view tree leaves it little stack.
	private isFilenameSafe(hash: string): boolean
	{
		for (let i = 0; i < hash.length; i++) {
			const c = hash.charCodeAt(i);
			const safe = (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 45 || c === 95;
			if (!safe) {
				return false;
			}
		}
		return true;
	}

}
