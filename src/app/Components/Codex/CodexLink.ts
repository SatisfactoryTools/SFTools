import {Params, QueryParamsHandling} from '@angular/router';

/**
 * Router ingredients for a link to a codex path, produced by the active
 * CodexNavigation - query-param based inside the planner panel, path based
 * on the fullscreen codex page.
 */
export interface CodexLink
{
	commands: string[];
	queryParams: Params | null;
	queryParamsHandling: QueryParamsHandling | null;
}
