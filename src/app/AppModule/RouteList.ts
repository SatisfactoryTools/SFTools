import {Routes} from '@angular/router';
import {HomeComponent} from '@src/AppModule/Components/Home/HomeComponent';
import {NotFoundComponent} from '@src/AppModule/Components/Errors/NotFoundComponent';
import {VersionResolver} from '@src/AppModule/Model/Data/VersionResolver';
import {ContentComponent} from '@src/AppModule/Components/Root/ContentComponent';

export class RouteList
{

	public static routes: Routes = [
		{
			path: '',
			component: ContentComponent,
			resolve: {
				versions: VersionResolver,
			},
			children: [
				//{path: 'versions'},
				//{path: ':version'},
				{path: '', component: HomeComponent},
				{path: '**', component: NotFoundComponent},
			],
		},
	];

}
