import {Component, ChangeDetectionStrategy, Injector, OnDestroy} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Params, Router, UrlSegment} from '@angular/router';
import {Subscription, of} from 'rxjs';
import {filter, take, timeout} from 'rxjs/operators';
import {AnalyticsService} from '@src/Model/Analytics/AnalyticsService';
import {Data} from '@src/Model/Data/Data';
import {VersionManager} from '@src/Model/Data/VersionManager';
import {OldGameVersion} from '@src/Model/OldTools/OldGameVersion';
import {OldToolsShareService} from '@src/Model/OldTools/OldToolsShareService';

const OLD_VERSIONS: ReadonlyArray<OldGameVersion> = ['0.8', '1.0', '1.0-ficsmas'];
const CODEX_SECTIONS: ReadonlyArray<string> = ['items', 'buildings', 'schematics'];

/** How long a codex link waits for the version data before settling for the section list. */
const DATA_WAIT_MS = 8000;

/**
 * Keeps the old Satisfactory Tools' URLs working now that this app answers on
 * its domain. The old site's addresses were `/{0.8|1.0|1.0-ficsmas}/…`
 * (production, codex/items/{slug}, …), every share link it ever handed out
 * is `/{version}/production?share=KEY`, and its "take my plans" button sends
 * people to `/import?old=k1,k2&ficsmas=k3`. None of those segments is a
 * version slug here, so without this they would all bounce to the home page
 * with the query string lost.
 *
 * Old versions map to the current public release of the same flavour
 * (FICSMAS or regular): the old data versions no longer exist, and a plan is
 * more useful in the live version than nowhere. Update 8 links land in the
 * regular release.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.Eager,
	template: `
		<div class="container py-5 text-center">
			<div class="spinner-border mb-3" role="status"></div>
			<div class="text-secondary">Opening…</div>
		</div>
	`,
})
export class LegacyUrlRedirectComponent implements OnDestroy
{

	private subscription: Subscription | null = null;

	public constructor(
		route: ActivatedRoute,
		private readonly router: Router,
		private readonly versionManager: VersionManager,
		private readonly shareService: OldToolsShareService,
		private readonly analytics: AnalyticsService,
		private readonly injector: Injector,
	)
	{
		const segments = route.snapshot.url.map(segment => segment.path);
		const query = route.snapshot.queryParams;
		const oldVersion = OLD_VERSIONS.find(version => version === segments[0]) ?? null;
		const path = oldVersion === null ? segments : segments.slice(1);
		this.redirect(oldVersion, path, query);
	}

	public ngOnDestroy(): void
	{
		this.subscription?.unsubscribe();
	}

	private redirect(oldVersion: OldGameVersion | null, path: string[], query: Params): void
	{
		this.analytics.trackEvent('OldTools', 'legacy-url', [oldVersion ?? '', ...path].join('/'));

		if (path[0] === 'import') {
			this.redirectImportLink(query);
			return;
		}

		const version = this.versionManager.defaultPublicVersion(oldVersion === '1.0-ficsmas');
		if (version === null) {
			this.go(['/']);
			return;
		}
		const slug = this.versionManager.urlSlug(version);

		const shareKey = typeof query['share'] === 'string' ? this.shareService.extractShareKey(query['share']) : null;
		if (shareKey !== null) {
			this.go(['/', slug, 'planner'], {importOld: shareKey});
			return;
		}

		switch (path[0]) {
			case undefined:
				this.go(['/']);
				return;
			case 'production':
				this.go(['/', slug, 'planner']);
				return;
			case 'codex':
				this.redirectCodexLink(slug, path[1] ?? null, path[2] ?? null);
				return;
			default:
				this.go(['/', slug, 'planner']);
		}
	}

	/**
	 * The old site's "Switch and take my plans": it shared every saved line
	 * and put the keys in the link, FICSMAS lines separately. Regular lines
	 * open first; the FICSMAS keys ride along so the dialog can offer them in
	 * the FICSMAS version afterwards. Only FICSMAS lines go straight there.
	 */
	private redirectImportLink(query: Params): void
	{
		const regularKeys = this.shareService.parseShareKeyList(typeof query['old'] === 'string' ? query['old'] : null);
		const ficsmasKeys = this.shareService.parseShareKeyList(typeof query['ficsmas'] === 'string' ? query['ficsmas'] : null);
		this.analytics.trackEvent('OldTools', 'import-link', undefined, regularKeys.length + ficsmasKeys.length);

		const onlyFicsmas = regularKeys.length === 0 && ficsmasKeys.length > 0;
		const version = this.versionManager.defaultPublicVersion(onlyFicsmas) ?? this.versionManager.defaultPublicVersion(!onlyFicsmas);
		if (version === null) {
			this.go(['/']);
			return;
		}
		const slug = this.versionManager.urlSlug(version);
		if (regularKeys.length === 0 && ficsmasKeys.length === 0) {
			this.go(['/', slug, 'planner']);
			return;
		}
		if (onlyFicsmas) {
			this.go(['/', slug, 'planner'], {importOld: ficsmasKeys.join(',')});
			return;
		}
		this.go(['/', slug, 'planner'], {
			importOld: regularKeys.join(','),
			importOldOther: ficsmasKeys.length > 0 ? ficsmasKeys.join(',') : null,
		});
	}

	/**
	 * Old codex links name entries by a slug of their display name
	 * (`codex/items/iron-plate`); this codex uses class names. Matching needs
	 * the version's data, which only loads once a version is active - so the
	 * target version is activated here and the data waited for. A slug that
	 * matches nothing (or data that does not arrive) opens the section list.
	 */
	private redirectCodexLink(slug: string, section: string | null, entrySlug: string | null): void
	{
		if (section === null || !CODEX_SECTIONS.includes(section)) {
			this.go(['/', slug, 'codex']);
			return;
		}
		if (entrySlug === null) {
			this.go(['/', slug, 'codex', section]);
			return;
		}

		this.versionManager.setActiveVersion(slug);
		this.subscription = toObservable(this.versionManager.activeVersionData, {injector: this.injector}).pipe(
			filter((data): data is Data => data !== null),
			take(1),
			timeout({first: DATA_WAIT_MS, with: () => of(null)}),
		).subscribe(data => {
			const className = data === null ? null : this.findClassName(data, section, entrySlug);
			this.go(className === null ? ['/', slug, 'codex', section] : ['/', slug, 'codex', section, className]);
		});
	}

	private findClassName(data: Data, section: string, entrySlug: string): string | null
	{
		const entries: ReadonlyArray<{name: string; className: string}> =
			section === 'items' ? data.items : section === 'buildings' ? data.buildings : data.schematics;
		return entries.find(entry => LegacyUrlRedirectComponent.webalize(entry.name) === entrySlug)?.className ?? null;
	}

	/** The old site's slug rule, so its links can be matched against names here. */
	private static webalize(name: string): string
	{
		return name.replace(/[\s|.]+/gi, '-').replace(/[™:]/gi, '').toLowerCase();
	}

	private go(commands: string[], queryParams: Params | null = null): void
	{
		void this.router.navigate(commands, {replaceUrl: true, queryParams: queryParams ?? undefined});
	}

}
