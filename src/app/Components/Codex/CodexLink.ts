import {Params, QueryParamsHandling} from '@angular/router';

export interface CodexLink
{
	commands: string[];
	queryParams: Params | null;
	queryParamsHandling: QueryParamsHandling | null;
}
