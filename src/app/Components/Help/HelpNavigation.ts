import {Signal, computed} from '@angular/core';
import {ActivatedRoute, Router, UrlTree} from '@angular/router';
import {HelpLink} from '@src/Components/Help/HelpLink';

/**
 * Where the help reader currently is and how to link within it. Help renders
 * in two hosts - the planner panel (state in a `?help=` query param) and the
 * fullscreen page (state in the URL path) - and each provides its own
 * implementation, so articles link exactly one way and work in both.
 *
 * A help path is '' for the article index, a slug ('first-plan'), or a slug
 * with a section anchor ('first-plan#setting-targets').
 */
export abstract class HelpNavigation
{

	/** The current help path; '' means the index. */
	public abstract readonly path: Signal<string>;

	/** The article being read, without its anchor; '' on the index. */
	public readonly slug: Signal<string> = computed(() => this.path().split('#')[0]);

	/** The section within the current article, without the '#'. */
	public readonly anchor: Signal<string> = computed(() => this.path().split('#')[1] ?? '');

	protected constructor(
		private readonly router: Router,
		private readonly route: ActivatedRoute,
	)
	{
	}

	/** The full router URL for a help path - for hrefs and imperative navigation alike. */
	public urlTree(path: string): UrlTree
	{
		const link = this.linkFor(path);
		return this.router.createUrlTree(link.commands, {
			relativeTo: this.route,
			queryParams: link.queryParams ?? undefined,
			queryParamsHandling: link.queryParamsHandling,
			fragment: link.fragment ?? undefined,
		});
	}

	public navigate(path: string): Promise<boolean>
	{
		return this.router.navigateByUrl(this.urlTree(path));
	}

	/** 'slug' or 'slug#anchor', with the empty anchor left out. */
	public static pathFor(slug: string, anchor: string = ''): string
	{
		return anchor === '' ? slug : `${slug}#${anchor}`;
	}

	protected abstract linkFor(path: string): HelpLink;

}
