/** One row/card in a codex list: any entity with icon(s), a name and a codex path. */
export interface CodexEntry
{
	link: string;
	icons: (string | null)[];
	name: string;
}
