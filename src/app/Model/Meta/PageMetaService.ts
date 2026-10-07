import {Injectable} from '@angular/core';
import {Meta, Title} from '@angular/platform-browser';
import {MetaText} from '@src/Model/Meta/MetaText';
import {PageMeta} from '@src/Model/Meta/PageMeta';

/**
 * Two layers: the route title from AppTitleStrategy underneath, and a page's own meta on top. A page owns its
 * layer until it clears it, so a path change within the same page (switching plans) cannot drop back to the route title.
 * Preview bots get the same values from index.php via GET /v1/meta; keep them in sync.
 */
@Injectable({providedIn: 'root'})
export class PageMetaService
{

	private static readonly DEFAULT_IMAGE_PATH = '/assets/icons/android-chrome-512x512.png';

	private routeMeta: PageMeta | null = null;
	private pageMeta: PageMeta | null = null;

	public constructor(
		private readonly titleService: Title,
		private readonly meta: Meta,
	)
	{
	}

	/** Not read back from index.html on null: index.php has already replaced its tags with the first page's. */
	public setRoute(page: PageMeta | null): void
	{
		this.routeMeta = page;
		this.render();
	}

	public set(page: PageMeta): void
	{
		this.pageMeta = page;
		this.render();
	}

	public clear(): void
	{
		this.pageMeta = null;
		this.render();
	}

	private render(): void
	{
		const page = this.pageMeta ?? this.routeMeta;
		if (page === null) {
			this.apply(MetaText.SITE_NAME, MetaText.DEFAULT_DESCRIPTION, this.defaultImage());
			return;
		}
		const description = page.description ? MetaText.description(page.description) : '';
		this.apply(
			MetaText.title(page.title),
			description !== '' ? description : MetaText.DEFAULT_DESCRIPTION,
			page.image ?? this.defaultImage(),
		);
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
