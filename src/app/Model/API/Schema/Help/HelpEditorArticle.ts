/** An article as the editor endpoints return it - drafts included. */
export interface HelpEditorArticle
{

	readonly id: string;
	readonly slug: string;
	readonly title: string;
	readonly summary: string;
	/** Null in list responses, which leave bodies out. */
	readonly body: string | null;
	readonly keywords: string[];
	/** Topic id to section anchor (no '#'; empty means the top of the article). */
	readonly topics: Record<string, string>;
	readonly seeAlso: string[];
	/** Category id, or null for the uncategorised group. */
	readonly category: string | null;
	readonly position: number;
	readonly published: boolean;
	readonly author: string | null;
	readonly createdAt: string;
	readonly updatedAt: string;

}
