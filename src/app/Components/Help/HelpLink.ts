import {QueryParamsHandling} from '@angular/router';

export interface HelpLink
{

	commands: unknown[];
	queryParams: Record<string, string | null> | null;
	queryParamsHandling: QueryParamsHandling | null;
	fragment: string | null;

}
