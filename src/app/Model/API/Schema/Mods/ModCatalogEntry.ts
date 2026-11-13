import {ModCatalogCounts} from '@src/Model/API/Schema/Mods/ModCatalogCounts';

export interface ModCatalogEntry
{

	id: string;
	name: string;
	reference: string | null;
	summary: string | null;
	logo: string | null;
	version: string;
	updatedAt: string;
	needs: string[];
	counts: ModCatalogCounts;

}
