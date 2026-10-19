import {Injectable, Signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router} from '@angular/router';
import {map} from 'rxjs/operators';
import {CodexLink} from '@src/Components/Codex/CodexLink';
import {CodexNavigation} from '@src/Components/Codex/CodexNavigation';

// The route matcher consumes the whole URL, so the first segment is always 'codex'.
@Injectable()
export class PageCodexNavigation extends CodexNavigation
{

	public readonly path: Signal<string>;

	public constructor(router: Router, private readonly pageRoute: ActivatedRoute)
	{
		super(router, pageRoute);
		this.path = toSignal(
			pageRoute.url.pipe(map(segments => segments.slice(1).map(segment => segment.path).join('/'))),
			{initialValue: pageRoute.snapshot.url.slice(1).map(segment => segment.path).join('/')},
		);
	}

	protected linkFor(path: string): CodexLink
	{
		// The URL's own slug, not the active version's: when no version matches it, an empty slug would make '//codex/...', which browsers read as another host.
		const slug = this.pageRoute.parent!.snapshot.paramMap.get('versionSlug')!;
		return {
			commands: ['/', slug, 'codex', ...path.split('/').filter(segment => segment !== '')],
			queryParams: null,
			queryParamsHandling: null,
		};
	}

}
