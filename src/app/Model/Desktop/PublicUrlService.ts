import {Injectable, Optional} from '@angular/core';
import {AppLinks} from '@src/Model/Desktop/AppLinks';
import {DesktopBridge} from '@src/Model/Desktop/DesktopBridge';

/** The desktop app's origin is local to the app, so links for other people point at the website instead. */
@Injectable({providedIn: 'root'})
export class PublicUrlService
{

	public constructor(@Optional() private readonly desktop: DesktopBridge | null)
	{
	}

	public url(path: string): string
	{
		return this.desktop === null ? window.location.origin + path : AppLinks.webUrl(path);
	}

}
