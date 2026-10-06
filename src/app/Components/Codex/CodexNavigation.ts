import {Signal} from '@angular/core';
import {ActivatedRoute, Router, UrlTree} from '@angular/router';
import {CodexLink} from '@src/Components/Codex/CodexLink';

export abstract class CodexNavigation
{

	public abstract readonly path: Signal<string>;

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
		});
	}

	public navigate(path: string): Promise<boolean>
	{
		return this.router.navigateByUrl(this.urlTree(path));
	}

	protected abstract linkFor(path: string): CodexLink;

}
