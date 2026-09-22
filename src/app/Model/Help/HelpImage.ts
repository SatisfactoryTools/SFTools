/** A picture from an article, as the full-size viewer needs it. */
export interface HelpImage
{

	/** The file itself, already resolved to a full URL. */
	src: string;

	/** The alternative text, for readers who cannot see the picture. */
	alt: string;

	/** The caption written under the picture, empty when it has none. */
	caption: string;

}
