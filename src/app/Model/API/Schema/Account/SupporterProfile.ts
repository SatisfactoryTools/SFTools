export interface SupporterProfile
{
	readonly since: string;
	readonly welcomed: boolean;
	readonly listed: boolean;
	readonly listName: string | null;
	readonly shareBadge: boolean;
	readonly accent: boolean;
	readonly nameHeart: boolean;
}
