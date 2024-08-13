/** Snapshot of the shared plans' game version identity at share time. */
export interface ShareVersion
{
	id: string;
	name: string;
	slug: string | null;
	experimental: boolean;
	custom: boolean;
	ficsmas: boolean;
}
