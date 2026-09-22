import {QueryParamsHandling} from '@angular/router';

/** A router link to a help path, as the current host builds it. */
export interface HelpLink
{

	commands: unknown[];
	queryParams: Record<string, string | null> | null;
	queryParamsHandling: QueryParamsHandling | null;
	/** Section anchor, on hosts whose URL can carry one. */
	fragment: string | null;

}
