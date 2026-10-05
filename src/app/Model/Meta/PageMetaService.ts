import {Injectable} from '@angular/core';
import {Meta, Title} from '@angular/platform-browser';
import {MetaText} from '@src/Model/Meta/MetaText';
import {PageMeta} from '@src/Model/Meta/PageMeta';

/**
 * Keeps the tab title and the description / og: / twitter: tags in step with
 * the page, for tab titles, history, bookmarks and crawlers that run
 * JavaScript. Preview bots never see this - they get the same values from the
 * web layer's index.php (deploy/web/), which asks the API's GET /v1/meta. Both
 * follow the URL → metadata table in docs/link-previews.md; keep them in sync.
 *
 * Route titles are applied by AppTitleStrategy; pages whose title depends on
 * loaded data (codex entries, help articles, shares) call set() once it is in.
 */
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

	/**
	 * The site defaults. Not read back from index.html: index.php has already
	 * replaced its tags with the first page's.
	 */
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
