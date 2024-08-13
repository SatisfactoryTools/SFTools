import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import {RouteList} from '@src/AppModule/RouteList';

@NgModule({
	imports: [RouterModule.forRoot(RouteList.routes)],
	exports: [RouterModule],
})
export class AppRoutingModule
{
}
