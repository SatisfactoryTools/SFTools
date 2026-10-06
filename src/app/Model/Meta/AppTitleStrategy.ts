import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy} from '@angular/router';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {PageMetaService} from '@src/Model/Meta/PageMetaService';

/**
 * Only a change of the URL path retitles: query/fragment changes (codex panel, help section) keep
 * what the page set, and pages that know better override from an effect that runs after this.
 */
@Injectable()
export class AppTitleStrategy extends TitleStrategy
{

	private lastPath: string | null = null;

	public constructor(
		private readonly pageMeta: PageMetaService,
		private readonly versionManager: VersionManager,
	)
	{
		super();
	}

	public override updateTitle(snapshot: RouterStateSnapshot): void
	{
		const path = snapshot.url.split(/[?#]/)[0];
		if (path === this.lastPath) {
			return;
		}
		this.lastPath = path;

		const title = this.buildTitle(snapshot);
		if (title === undefined) {
			this.pageMeta.reset();
			return;
		}
		const description = this.deepestDescription(snapshot.root);
		this.pageMeta.set({
			title: this.withVersion(title),
			description: description !== null ? this.withVersion(description) : null,
		});
	}

	private deepestDescription(route: ActivatedRouteSnapshot): string | null
	{
		let description: string | null = null;
		for (let current: ActivatedRouteSnapshot | null = route; current !== null; current = current.firstChild) {
			const value = current.data['description'];
			description = typeof value === 'string' ? value : description;
		}
		return description;
	}

	private withVersion(text: string): string
	{
		return text.replaceAll('{V}', this.versionManager.activeVersion()?.name ?? '');
	}

}
