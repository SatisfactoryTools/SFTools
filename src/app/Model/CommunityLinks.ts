import {faDiscord, faGithub, faPatreon, faPaypal} from '@fortawesome/free-brands-svg-icons';
import {CommunityLink} from '@src/Model/CommunityLink';

/**
 * The project's external links, shown in the navbar, the home hero and the
 * About page. Donation links exist so people who want to can, not to push -
 * the tools are free; keep their presentation quiet wherever they appear.
 */
export class CommunityLinks
{

	public static readonly DISCORD: CommunityLink = {key: 'discord', label: 'Discord', url: 'https://discord.gg/pcGyj8p', icon: faDiscord, color: '#7289da', kind: 'community'};
	public static readonly GITHUB: CommunityLink = {key: 'github', label: 'GitHub', url: 'https://github.com/SatisfactoryTools', icon: faGithub, color: '#f0f6fc', kind: 'community'};
	public static readonly PAYPAL: CommunityLink = {key: 'paypal', label: 'PayPal', url: 'https://www.paypal.me/greenydev', icon: faPaypal, color: '#4fb8ff', kind: 'donation'};
	public static readonly PATREON: CommunityLink = {key: 'patreon', label: 'Patreon', url: 'https://patreon.com/greeny_dev', icon: faPatreon, color: '#ff6b7a', kind: 'donation'};

	public static readonly COMMUNITY: CommunityLink[] = [CommunityLinks.DISCORD, CommunityLinks.GITHUB];
	public static readonly DONATIONS: CommunityLink[] = [CommunityLinks.PAYPAL, CommunityLinks.PATREON];

}
