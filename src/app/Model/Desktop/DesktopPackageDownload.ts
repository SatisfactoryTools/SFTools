import {DesktopPackageInfo} from '@src/Model/Desktop/DesktopPackageInfo';

export interface DesktopPackageDownload
{

	readonly info: DesktopPackageInfo;

	readonly url: string;

	readonly size: number | null;

}
