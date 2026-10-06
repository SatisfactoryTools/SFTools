import {Injectable, Optional} from '@angular/core';
import {env} from '@env/env';
import {DesktopBridge} from '@src/Model/Desktop/DesktopBridge';

@Injectable({providedIn: 'root'})
export class AppPlatform
{

	public readonly desktop: boolean;

	public readonly device: string;

	public readonly desktopAppPublic: boolean;

	public constructor(@Optional() desktop: DesktopBridge | null)
	{
		this.desktop = desktop !== null;
		this.device = this.desktop ? 'this computer' : 'this browser';
		this.desktopAppPublic = env.desktopAppPublic;
	}

}
