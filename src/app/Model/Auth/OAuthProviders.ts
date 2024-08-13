import {faDiscord, faGithub, faGoogle, faSteam} from '@fortawesome/free-brands-svg-icons';
import {OAuthProviderInfo} from '@src/Model/Auth/OAuthProviderInfo';

/** The supported third-party providers, in the order they are offered (password login comes last). */
export class OAuthProviders
{

	public static readonly ALL: OAuthProviderInfo[] = [
		{key: 'discord', label: 'Discord', icon: faDiscord},
		{key: 'github', label: 'GitHub', icon: faGithub},
		{key: 'google', label: 'Google', icon: faGoogle},
		{key: 'steam', label: 'Steam', icon: faSteam},
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
