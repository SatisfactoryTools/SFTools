import {ModVersion} from '@src/Model/API/Schema/Mods/ModVersion';

export interface Mod
{

	id: string;
	name: string;
	public: boolean;
	reference: string | null;
	owned: boolean;
	createdAt: string;
	versions: ModVersion[];

}
