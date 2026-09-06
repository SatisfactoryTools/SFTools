import {faDiscord, faGithub, faGoogle, faSteam} from '@fortawesome/free-brands-svg-icons';
import {OAuthProviderInfo} from '@src/Model/Auth/OAuthProviderInfo';

/** The supported third-party providers, in the order they are offered (password login comes last). */
export class OAuthProviders
{

	public static readonly ALL: OAuthProviderInfo[] = [
		{key: 'discord', label: 'Discord', icon: faDiscord, color: '#7289da'},
		{key: 'github', label: 'GitHub', icon: faGithub, color: '#f0f6fc'},
		{key: 'google', label: 'Google', icon: faGoogle, color: '#4285f4'},
		{key: 'steam', label: 'Steam', icon: faSteam, color: '#66c0f4'},
	];

	public static find(key: string): OAuthProviderInfo | null
	{
		return OAuthProviders.ALL.find(provider => provider.key === key) ?? null;
	}

	public static labelOf(key: string): string
	{
		return OAuthProviders.find(key)?.label ?? key;
	}

}
