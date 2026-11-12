export interface ModVersion
{

	id: string;
	mod: string;
	name: string;
	hasData: boolean;
	createdAt: string;
	sourceVersionId: string | null;
	dependencies: string[];

}
