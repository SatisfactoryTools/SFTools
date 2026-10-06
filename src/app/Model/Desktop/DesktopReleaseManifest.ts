import {DesktopReleasePlatform} from '@src/Model/Desktop/DesktopReleasePlatform';

export interface DesktopReleaseManifest
{

	readonly version: string;

	readonly notes?: string;

	readonly pub_date?: string;

	readonly platforms: Record<string, DesktopReleasePlatform>;

}
