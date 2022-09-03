import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {RootComponent} from '@src/AppModule/Components/Root/RootComponent';
import {AppRoutingModule} from '@src/AppModule/AppRoutingModule';

@NgModule({
	declarations: [
		RootComponent,
	],
	imports: [
		BrowserModule,
		AppRoutingModule,
	],
	providers: [],
	bootstrap: [RootComponent],
})
export class AppModule
{
}
