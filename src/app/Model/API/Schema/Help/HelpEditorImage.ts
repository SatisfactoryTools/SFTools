/** An uploaded screenshot, as listed and returned by the editor endpoints. */
export interface HelpEditorImage
{

	readonly id: string;
	readonly fileName: string;
	/** Path relative to the API root, e.g. data/help/images/{id}.png. */
	readonly path: string;
	readonly uploadedAt: string;

}
