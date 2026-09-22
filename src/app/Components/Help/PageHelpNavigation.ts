import {Injectable, Signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router} from '@angular/router';
import {combineLatest} from 'rxjs';
import {map} from 'rxjs/operators';
import {HelpLink} from '@src/Components/Help/HelpLink';
import {HelpNavigation} from '@src/Components/Help/HelpNavigation';

/**
 * Help navigation for the fullscreen page: the article is the URL after
 * `/help` (the route matcher consumes all of it, so the first segment here is
 * always 'help') and the section is the URL fragment.
 */
@Injectable()
export class PageHelpNavigation extends HelpNavigation
{

	public readonly path: Signal<string>;

	public constructor(router: Router, route: ActivatedRoute)
	{
		super(router, route);
		this.path = toSignal(
			combineLatest([route.url, route.fragment]).pipe(
				map(([segments, fragment]) => HelpNavigation.pathFor(
					segments.slice(1).map(segment => segment.path).join('/'),
					fragment ?? '',
				)),
			),
			{
				initialValue: HelpNavigation.pathFor(
					route.snapshot.url.slice(1).map(segment => segment.path).join('/'),
					route.snapshot.fragment ?? '',
				),
			},
		);
	}

	protected linkFor(path: string): HelpLink
	{
		const [slug, anchor = ''] = path.split('#');
		return {
			commands: ['/', 'help', ...slug.split('/').filter(segment => segment !== '')],
			queryParams: null,
			queryParamsHandling: null,
			fragment: anchor === '' ? null : anchor,
		};
	}

}
