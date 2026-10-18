import {CreditGroup} from '@src/Model/About/CreditGroup';

export class CreditList
{

	public static readonly BETA_TESTERS: CreditGroup = {
		key: 'beta-testers',
		title: 'Beta testers',
		text: 'Thank you to everyone who tested the beta and sent feedback:',
		names: ['C.R.O.W', 'chaous', 'CyberCenturion', 'djevrek', 'Dr Jimboza', 'Eggplant42', 'freimatz', 'Guys let\'s play', 'Idle1010', 'INSANE', 'Jaguar', 'Kanzaji', 'KYO297', 'Lily', 'lunar', 'Maksymilian Erykowski', 'ManniBoy', 'Mantades', 'Megras', 'Mr. Sandman', 'Muzzy', 'Natro', 'Ninjaspeed_tv', 'Ondar', 'purpledragon264', 'Sevrahn', 'squirtles__', 'Sum Dumguy', 'Totalxclipse', 'twentylemon', 'Vanilama', 'Willo', 'x4077', 'Zedisious'],
	};

	public static readonly GROUPS: CreditGroup[] = [CreditList.BETA_TESTERS].filter(group => group.names.length > 0);

}
