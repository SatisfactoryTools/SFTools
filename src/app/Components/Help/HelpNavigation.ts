import {Signal, computed} from '@angular/core';
import {ActivatedRoute, Router, UrlTree} from '@angular/router';
import {HelpLink} from '@src/Components/Help/HelpLink';

export abstract class HelpNavigation
{

	public abstract readonly path: Signal<string>;

	public readonly slug: Signal<string> = computed(() => this.path().split('#')[0]);

	public readonly anchor: Signal<string> = computed(() => this.path().split('#')[1] ?? '');

	protected constructor(
		private readonly router: Router,
		private readonly route: ActivatedRoute,
	)
	{
	}

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

	public static pathFor(slug: string, anchor: string = ''): string
	{
		return anchor === '' ? slug : `${slug}#${anchor}`;
	}

	protected abstract linkFor(path: string): HelpLink;

}
