/** An image picked in the mod editor, held locally until the upload endpoint exists. */
export interface ModImage
{
	/** Placeholder id written into the JSON; the real upload will hand out server ids instead. */
	readonly id: string;
	readonly name: string;
	/** Object URL for previews; valid for the session. */
	readonly url: string;
	readonly file: File;
}
