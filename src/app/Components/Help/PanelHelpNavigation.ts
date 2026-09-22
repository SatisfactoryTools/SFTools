import {Injectable, Signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router} from '@angular/router';
import {map} from 'rxjs/operators';
import {HelpLink} from '@src/Components/Help/HelpLink';
import {HelpNavigation} from '@src/Components/Help/HelpNavigation';

/**
 * Help navigation for the planner panel: the whole help path (article and
 * section alike) lives in the `?help=` query param of the current planner URL,
 * so reading help never leaves the plan and a refresh restores the panel.
 */
@Injectable()
export class PanelHelpNavigation extends HelpNavigation
{

	public readonly path: Signal<string>;

	public constructor(router: Router, route: ActivatedRoute)
	{
		super(router, route);
		this.path = toSignal(
			route.queryParamMap.pipe(map(params => params.get('help') ?? '')),
			{initialValue: route.snapshot.queryParamMap.get('help') ?? ''},
		);
	}

	protected linkFor(path: string): HelpLink
	{
		return {
			commands: [],
			queryParams: {help: path === '' ? null : path},
			queryParamsHandling: 'merge',
			fragment: null,
		};
	}

}
