import {IconDefinition} from '@fortawesome/fontawesome-svg-core';
import {DesktopPackageInfo} from '@src/Model/Desktop/DesktopPackageInfo';

export interface DesktopPlatformInfo
{

	readonly key: string;

	readonly name: string;

	readonly icon: IconDefinition;

	/** One line under the name: architecture, minimum version. */
	readonly description: string;

	/** The first one is the main download. */
	readonly packages: DesktopPackageInfo[];

	readonly experimental?: boolean;

	/** Shown under the buttons. */
	readonly note?: string;

}
