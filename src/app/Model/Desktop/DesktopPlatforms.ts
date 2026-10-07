import {faApple, faLinux, faWindows} from '@fortawesome/free-brands-svg-icons';
import {DesktopPlatformInfo} from '@src/Model/Desktop/DesktopPlatformInfo';

export class DesktopPlatforms
{

	public static readonly WINDOWS: DesktopPlatformInfo = {
		key: 'windows',
		name: 'Windows',
		icon: faWindows,
		description: 'Windows 10 and 11, 64-bit',
		packages: [
			{key: 'windows-x86_64', label: 'Installer (.exe)', file: 'Installs for the current user, no wizard'},
		],
	};

	public static readonly LINUX: DesktopPlatformInfo = {
		key: 'linux',
		name: 'Linux',
		icon: faLinux,
		description: 'x86_64',
		packages: [
			{key: 'linux-x86_64', label: 'AppImage', file: 'Runs on any distribution without installing'},
			{key: 'linux-x86_64-deb', label: '.deb', file: 'Debian, Ubuntu and derivatives. Updates ask for your password.'},
			{key: 'linux-x86_64-rpm', label: '.rpm', file: 'Fedora, openSUSE and derivatives. Updates ask for your password.'},
		],
	};

	public static readonly MACOS: DesktopPlatformInfo = {
		key: 'macos',
		name: 'macOS',
		icon: faApple,
		description: 'Apple silicon and Intel, macOS 13 or newer',
		packages: [
			{key: 'darwin-universal-dmg', label: 'Disk image (.dmg)', file: 'Drag the app into Applications'},
		],
		experimental: true,
		note: 'If macOS refuses to open the app, go to System Settings, Privacy & Security, and choose "Open Anyway".',
	};

	/** Display order when none matches the visitor's computer. */
	public static readonly ALL: DesktopPlatformInfo[] = [DesktopPlatforms.WINDOWS, DesktopPlatforms.LINUX, DesktopPlatforms.MACOS];

}
