import {Component} from '@angular/core';
import {ActivatedRoute, Data} from '@angular/router';
import {from, map, Observable} from 'rxjs';
import {Version} from '@src/AppModule/Model/Data/Version';

@Component({
	templateUrl: './ContentComponent.html',
})
export class ContentComponent
{

	public hasError: Observable<boolean>;

	public constructor(private activatedRoute: ActivatedRoute)
	{
		this.hasError = from(activatedRoute.data).pipe(
			map(({versions}) => !versions),
		);
	}

}

interface IContentComponentRouteData extends Data
{

	versions: Version[];

}
