export interface DesktopInfo
{

	readonly version: string;

	readonly platform: 'windows' | 'linux' | 'macos';

	readonly imageBase: string;

	readonly dataDir: string;

	readonly storage: Record<string, string>;

}
