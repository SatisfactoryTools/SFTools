import {Injectable, Signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute} from '@angular/router';
import {map} from 'rxjs/operators';
import {CodexLink} from '@src/Components/Codex/CodexLink';
import {CodexNavigation} from '@src/Components/Codex/CodexNavigation';
import {VersionManager} from '@src/Model/Data/VersionManager';

/**
 * Codex navigation for the fullscreen page: the codex path is the URL after
 * `/[version]/codex` (the route matcher consumes all of it, so the first URL
 * segment here is always 'codex').
 */
@Injectable()
export class PageCodexNavigation extends CodexNavigation
{

	public readonly path: Signal<string>;

	public constructor(route: ActivatedRoute, private readonly versionManager: VersionManager)
	{
		super();
		this.path = toSignal(
			route.url.pipe(map(segments => segments.slice(1).map(segment => segment.path).join('/'))),
			{initialValue: route.snapshot.url.slice(1).map(segment => segment.path).join('/')},
		);
	}

	public linkFor(path: string): CodexLink
	{
		const version = this.versionManager.activeVersion();
		const slug = version !== null ? this.versionManager.urlSlug(version) : '';
		return {
			commands: ['/', slug, 'codex', ...path.split('/').filter(segment => segment !== '')],
			queryParams: null,
			queryParamsHandling: null,
		};
	}

}
