import {Signal} from '@angular/core';
import {ActivatedRoute, Router, UrlTree} from '@angular/router';
import {CodexLink} from '@src/Components/Codex/CodexLink';

/**
 * Where the codex currently is and how to link within it. The codex renders
 * in two hosts - the planner panel (state in a `?codex=` query param) and the
 * fullscreen page (state in the URL path) - and each provides its own
 * implementation, so codex content builds links exactly one way and works in
 * both. Codex paths are strings like '', 'items' or 'items/Desc_Cable_C'.
 */
export abstract class CodexNavigation
{

	/** The current codex path; '' means the section menu. */
	public abstract readonly path: Signal<string>;

	protected constructor(
		private readonly router: Router,
		private readonly route: ActivatedRoute,
	)
	{
	}

	/** The full router URL for a codex path - for hrefs and imperative navigation alike. */
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
