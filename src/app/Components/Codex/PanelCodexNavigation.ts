import {Injectable, Signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute} from '@angular/router';
import {map} from 'rxjs/operators';
import {CodexLink} from '@src/Components/Codex/CodexLink';
import {CodexNavigation} from '@src/Components/Codex/CodexNavigation';

/**
 * Codex navigation for the planner panel: the codex path lives in the
 * `?codex=` query param of the current (planner) URL, so browsing the codex
 * never leaves the plan and a refresh restores the panel content.
 */
@Injectable()
export class PanelCodexNavigation extends CodexNavigation
{

	public readonly path: Signal<string>;

	public constructor(route: ActivatedRoute)
	{
		super();
		this.path = toSignal(
			route.queryParamMap.pipe(map(params => params.get('codex') ?? '')),
			{initialValue: route.snapshot.queryParamMap.get('codex') ?? ''},
		);
	}

	public linkFor(path: string): CodexLink
	{
		return {
			commands: [],
			queryParams: {codex: path === '' ? null : path},
			queryParamsHandling: 'merge',
		};
	}

}
