import {Injectable} from '@angular/core';
import {Meta, Title} from '@angular/platform-browser';
import {MetaText} from '@src/Model/Meta/MetaText';
import {PageMeta} from '@src/Model/Meta/PageMeta';

/** Preview bots get the same values from index.php via GET /v1/meta; both follow docs/link-previews.md, keep them in sync. */
@Injectable({providedIn: 'root'})
export class PageMetaService
{

	private static readonly DEFAULT_IMAGE_PATH = '/assets/icons/android-chrome-512x512.png';

	public constructor(
		private readonly titleService: Title,
		private readonly meta: Meta,
	)
	{
	}

	public set(page: PageMeta): void
	{
		const description = page.description ? MetaText.description(page.description) : '';
		this.apply(
			MetaText.title(page.title),
			description !== '' ? description : MetaText.DEFAULT_DESCRIPTION,
			page.image ?? this.defaultImage(),
		);
	}

	/** Not read back from index.html: index.php has already replaced its tags with the first page's. */
	public reset(): void
	{
		this.apply(MetaText.SITE_NAME, MetaText.DEFAULT_DESCRIPTION, this.defaultImage());
	}

	private apply(title: string, description: string, image: string): void
	{
		this.titleService.setTitle(title);
		this.meta.updateTag({name: 'description', content: description});
		this.meta.updateTag({property: 'og:title', content: title});
		this.meta.updateTag({property: 'og:description', content: description});
		this.meta.updateTag({property: 'og:image', content: image});
		this.meta.updateTag({name: 'twitter:title', content: title});
		this.meta.updateTag({name: 'twitter:description', content: description});
		this.meta.updateTag({name: 'twitter:image', content: image});
	}

	private defaultImage(): string
	{
		return window.location.origin + PageMetaService.DEFAULT_IMAGE_PATH;
	}

}
