import {DesktopPackageDownload} from '@src/Model/Desktop/DesktopPackageDownload';
import {DesktopPlatformInfo} from '@src/Model/Desktop/DesktopPlatformInfo';

export interface DesktopDownload
{

	readonly platform: DesktopPlatformInfo;

	/** In the platform's order: the first is the main button. */
	readonly packages: DesktopPackageDownload[];

	readonly recommended: boolean;

}
