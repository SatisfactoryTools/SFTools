import {Injectable} from '@angular/core';
import {DesktopPlatformInfo} from '@src/Model/Desktop/DesktopPlatformInfo';
import {DesktopPlatforms} from '@src/Model/Desktop/DesktopPlatforms';

@Injectable({providedIn: 'root'})
export class VisitorPlatformService
{

	/** The desktop platform this browser runs on, or null when there is no build for it (phones, tablets, ChromeOS). */
	public detect(): DesktopPlatformInfo | null
	{
		const hints = (navigator as Navigator & {userAgentData?: {platform?: string; mobile?: boolean}}).userAgentData;
		const agent = navigator.userAgent.toLowerCase();
		if (hints?.mobile === true || /android|iphone|ipad|mobile|cros/.test(agent)) {
			return null;
		}
		const platform = (hints?.platform ?? navigator.platform ?? '').toLowerCase();
		if (platform.startsWith('win') || agent.includes('windows')) {
			return DesktopPlatforms.WINDOWS;
		}
		if (platform.startsWith('linux') || agent.includes('linux')) {
			return DesktopPlatforms.LINUX;
		}
		// An iPad asking for the desktop site says "Macintosh" too; touch tells it apart.
		if ((platform.startsWith('mac') || agent.includes('macintosh')) && navigator.maxTouchPoints <= 1) {
			return DesktopPlatforms.MACOS;
		}
		return null;
	}

}
