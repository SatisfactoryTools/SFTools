export interface HelpEditorArticle
{

	readonly id: string;
	readonly slug: string;
	readonly title: string;
	readonly summary: string;
	readonly body: string | null;
	readonly keywords: string[];
	readonly topics: Record<string, string>;
	readonly seeAlso: string[];
	readonly category: string | null;
	readonly position: number;
	readonly published: boolean;
	readonly author: string | null;
	readonly createdAt: string;
	readonly updatedAt: string;

}
