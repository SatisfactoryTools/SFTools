/** A help category as the editor endpoints return it. */
export interface HelpEditorCategory
{

	readonly id: string;
	readonly slug: string;
	readonly name: string;
	readonly position: number;
	readonly articleCount: number;

}
